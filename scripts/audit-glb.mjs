import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { MeshoptDecoder } from 'meshoptimizer';

const PROJECT_ROOT = process.cwd();
const MODELS_ROOT = path.join(PROJECT_ROOT, 'assets', 'models');
const REPORTS_ROOT = path.join(PROJECT_ROOT, 'reports');
const JSON_REPORT = path.join(REPORTS_ROOT, 'audit.json');
const TABLE_REPORT = path.join(REPORTS_ROOT, 'audit-table.md');

const round = (value, digits = 4) =>
	Number.isFinite(value) ? Number(value.toFixed(digits)) : null;

const asPosix = (value) => value.split(path.sep).join('/');

async function listGlbFiles(directory) {
	const entries = await fs.readdir(directory, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const absolutePath = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await listGlbFiles(absolutePath)));
		} else if (entry.isFile() && entry.name.toLowerCase().endsWith('.glb')) {
			files.push(absolutePath);
		}
	}

	return files.sort((a, b) => a.localeCompare(b));
}

function textureSummary(texture, index) {
	const size = texture.getSize();
	return {
		index,
		name: texture.getName() || null,
		uri: texture.getURI() || null,
		format: texture.getMimeType() || null,
		resolution: size ? { width: size[0], height: size[1] } : null,
	};
}

function materialSummary(material, index, textureIndexes) {
	const emissiveStrengthExtension = material.getExtension(
		'KHR_materials_emissive_strength',
	);
	const textureRef = (texture) =>
		texture
			? {
					index: textureIndexes.get(texture) ?? null,
					name: texture.getName() || null,
				}
			: null;

	return {
		index,
		name: material.getName() || null,
		baseColorFactor: material.getBaseColorFactor().map((value) => round(value)),
		metallicFactor: round(material.getMetallicFactor()),
		roughnessFactor: round(material.getRoughnessFactor()),
		emissiveFactor: material.getEmissiveFactor().map((value) => round(value)),
		hasKHRMaterialsEmissiveStrength: Boolean(emissiveStrengthExtension),
		emissiveStrength:
			emissiveStrengthExtension?.getEmissiveStrength?.() ?? null,
		textures: {
			baseColor: textureRef(material.getBaseColorTexture()),
			metallicRoughness: textureRef(material.getMetallicRoughnessTexture()),
			normal: textureRef(material.getNormalTexture()),
			occlusion: textureRef(material.getOcclusionTexture()),
			emissive: textureRef(material.getEmissiveTexture()),
		},
	};
}

function maxHierarchyDepth(scenes) {
	let maxDepth = 0;

	const visit = (node, depth) => {
		maxDepth = Math.max(maxDepth, depth);
		for (const child of node.listChildren()) visit(child, depth + 1);
	};

	for (const scene of scenes) {
		for (const child of scene.listChildren()) visit(child, 1);
	}

	return maxDepth;
}

function classifyPivot(min, max) {
	const dimensions = max.map((value, index) => value - min[index]);
	const center = min.map((value, index) => (value + max[index]) / 2);
	const largestDimension = Math.max(...dimensions, 1e-6);
	const tolerance = Math.max(largestDimension * 0.02, 1e-5);
	const origin = [0, 0, 0];
	const relativeToBbox = dimensions.map((dimension, index) =>
		dimension > 1e-8 ? round((origin[index] - min[index]) / dimension) : null,
	);
	const horizontallyCentered =
		Math.abs(center[0]) <= tolerance && Math.abs(center[2]) <= tolerance;
	const onBottom = Math.abs(min[1]) <= tolerance;
	const centered = center.every((value) => Math.abs(value) <= tolerance);

	return {
		classification:
			onBottom && horizontallyCentered
				? 'bottom-center'
				: centered
					? 'center'
					: onBottom
						? 'bottom-arbitrary'
						: 'arbitrary',
		origin,
		relativeToBbox,
		tolerance: round(tolerance),
	};
}

function animationSummary(animation, index) {
	let durationSeconds = 0;

	for (const sampler of animation.listSamplers()) {
		const input = sampler.getInput();
		const values = input?.getArray();
		if (!values) continue;
		for (const value of values) durationSeconds = Math.max(durationSeconds, value);
	}

	return {
		index,
		name: animation.getName() || null,
		channels: animation.listChannels().length,
		samplers: animation.listSamplers().length,
		durationSeconds: round(durationSeconds),
	};
}

async function auditFile(io, absolutePath) {
	const stats = await fs.stat(absolutePath);
	const document = await io.read(absolutePath);
	const root = document.getRoot();
	const meshes = root.listMeshes();
	const scenes = root.listScenes();
	const textures = root.listTextures();
	const textureIndexes = new Map(textures.map((texture, index) => [texture, index]));
	const materials = root
		.listMaterials()
		.map((material, index) => materialSummary(material, index, textureIndexes));
	const textureDetails = textures.map(textureSummary);
	const primitives = meshes.flatMap((mesh) => mesh.listPrimitives());
	const vertexCount = primitives.reduce(
		(total, primitive) =>
			total + (primitive.getAttribute('POSITION')?.getCount() ?? 0),
		0,
	);
	const sceneBounds = scenes.map((scene) => getBounds(scene));
	const min = [Infinity, Infinity, Infinity];
	const max = [-Infinity, -Infinity, -Infinity];

	for (const bounds of sceneBounds) {
		for (let axis = 0; axis < 3; axis += 1) {
			min[axis] = Math.min(min[axis], bounds.min[axis]);
			max[axis] = Math.max(max[axis], bounds.max[axis]);
		}
	}

	if (!sceneBounds.length) {
		min.fill(0);
		max.fill(0);
	}

	const roundedMin = min.map((value) => round(value));
	const roundedMax = max.map((value) => round(value));
	const dimensions = {
		width: round(max[0] - min[0]),
		height: round(max[1] - min[1]),
		depth: round(max[2] - min[2]),
	};
	const extensionsUsed = root
		.listExtensionsUsed()
		.map((extension) => extension.extensionName)
		.sort();

	return {
		file: asPosix(path.relative(MODELS_ROOT, absolutePath)),
		assetId: asPosix(
			path.relative(MODELS_ROOT, absolutePath).replace(/\.glb$/i, ''),
		),
		sizeBytes: stats.size,
		sizeMiB: round(stats.size / (1024 * 1024), 3),
		meshes: meshes.length,
		primitives: primitives.length,
		vertexCount,
		materialNames: materials.map(
			(material) => material.name ?? `(unnamed-${material.index})`,
		),
		materials,
		textures: textureDetails,
		hasKHRMaterialsEmissiveStrength: extensionsUsed.includes(
			'KHR_materials_emissive_strength',
		),
		extensionsUsed,
		bounds: {
			min: roundedMin,
			max: roundedMax,
			...dimensions,
		},
		pivot: classifyPivot(min, max),
		hierarchyDepth: maxHierarchyDepth(scenes),
		skins: root.listSkins().length,
		animations: root
			.listAnimations()
			.map((animation, index) => animationSummary(animation, index)),
	};
}

function createMarkdown(report) {
	const lines = [
		'# GLB Asset Audit',
		'',
		`Generated: ${report.generatedAt}`,
		'',
		`Scanned **${report.summary.fileCount}** files: **${report.summary.successCount}** passed, **${report.summary.failureCount}** failed.`,
		'',
		'| File | MiB | Meshes | Prims | Vertices | Materials | Textures | W × H × D | Pivot | Depth | Animations | Emissive ext |',
		'|---|---:|---:|---:|---:|---:|---:|---|---|---:|---:|:---:|',
	];

	for (const asset of report.assets) {
		const bounds = asset.bounds;
		lines.push(
			`| \`${asset.file}\` | ${asset.sizeMiB} | ${asset.meshes} | ${asset.primitives} | ${asset.vertexCount} | ${asset.materials.length} | ${asset.textures.length} | ${bounds.width} × ${bounds.height} × ${bounds.depth} | ${asset.pivot.classification} | ${asset.hierarchyDepth} | ${asset.animations.length} | ${asset.hasKHRMaterialsEmissiveStrength ? 'yes' : 'no'} |`,
		);
	}

	if (report.errors.length) {
		lines.push('', '## Read errors', '');
		for (const error of report.errors) {
			lines.push(`- \`${error.file}\`: ${error.message}`);
		}
	}

	return `${lines.join('\n')}\n`;
}

async function main() {
	const [decoder] = await Promise.all([
		draco3d.createDecoderModule(),
		MeshoptDecoder.ready,
	]);
	const io = new NodeIO()
		.registerExtensions(ALL_EXTENSIONS)
		.registerDependencies({
			'draco3d.decoder': decoder,
			'meshopt.decoder': MeshoptDecoder,
		});
	const files = await listGlbFiles(MODELS_ROOT);
	const assets = [];
	const errors = [];

	for (let index = 0; index < files.length; index += 1) {
		const absolutePath = files[index];
		const relativePath = asPosix(path.relative(MODELS_ROOT, absolutePath));
		process.stdout.write(`[${index + 1}/${files.length}] ${relativePath}\n`);
		try {
			assets.push(await auditFile(io, absolutePath));
		} catch (error) {
			errors.push({
				file: relativePath,
				message: error instanceof Error ? error.message : String(error),
			});
		}
	}

	const report = {
		generatedAt: new Date().toISOString(),
		scannedRoot: 'assets/models',
		summary: {
			fileCount: files.length,
			successCount: assets.length,
			failureCount: errors.length,
			totalSizeBytes: assets.reduce((total, asset) => total + asset.sizeBytes, 0),
			totalVertices: assets.reduce(
				(total, asset) => total + asset.vertexCount,
				0,
			),
			totalMaterials: assets.reduce(
				(total, asset) => total + asset.materials.length,
				0,
			),
			totalTextures: assets.reduce(
				(total, asset) => total + asset.textures.length,
				0,
			),
			filesWithAnimations: assets.filter((asset) => asset.animations.length > 0)
				.length,
			filesWithSkins: assets.filter((asset) => asset.skins > 0).length,
			filesWithKHRMaterialsEmissiveStrength: assets.filter(
				(asset) => asset.hasKHRMaterialsEmissiveStrength,
			).length,
		},
		assets,
		errors,
	};

	await fs.mkdir(REPORTS_ROOT, { recursive: true });
	await Promise.all([
		fs.writeFile(JSON_REPORT, `${JSON.stringify(report, null, 2)}\n`, 'utf8'),
		fs.writeFile(TABLE_REPORT, createMarkdown(report), 'utf8'),
	]);

	process.stdout.write(
		`\nWrote ${asPosix(path.relative(PROJECT_ROOT, JSON_REPORT))} and ${asPosix(path.relative(PROJECT_ROOT, TABLE_REPORT))}.\n`,
	);
	if (errors.length) process.exitCode = 1;
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
