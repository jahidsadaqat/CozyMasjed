export type InteractionFeedbackEvent =
  | 'ui'
  | 'selection'
  | 'assetSelect'
  | 'dragStart'
  | 'camera'
  | 'captureSuccess'
  | 'captureError'
  | 'place'
  | 'move'
  | 'settle'
  | 'delete'
  | 'buildingSwitch'
  | 'reject';

export type InteractionFeedbackOptions = {
  sound?: boolean;
  haptic?: boolean;
};

export type InteractionFeedbackSignal = {
  event: InteractionFeedbackEvent;
  sound: boolean;
  haptic: boolean;
};

type InteractionFeedbackListener = (signal: InteractionFeedbackSignal) => void;

const listeners = new Set<InteractionFeedbackListener>();

export function emitInteractionFeedback(
  event: InteractionFeedbackEvent,
  options: InteractionFeedbackOptions = {},
) {
  const signal: InteractionFeedbackSignal = {
    event,
    sound: options.sound ?? true,
    haptic: options.haptic ?? true,
  };
  listeners.forEach((listener) => {
    try {
      listener(signal);
    } catch (error) {
      // Feedback must never interrupt the room edit that emitted it.
      console.warn(`Interaction feedback listener failed for "${event}".`, error);
    }
  });
}

export function subscribeToInteractionFeedback(listener: InteractionFeedbackListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
