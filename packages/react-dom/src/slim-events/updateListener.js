/* @flow */

import warning from 'shared/warning';

const REACT_EVENT_LISTENERS = '__react_listeners';
const BUBBLE_INDEX = 0;
const CAPTURE_INDEX = 1;

/**
 * Register native event listeners on the dom element. We don't need a reference
 * to the previous listener since we store listeners on the dom element.
 *
 * @TODO(philipp): Monkey patch EventTarget.dispatchEvent() and install the
 * synchronous batching system.
 */
export function updateListener(
  element: Element,
  propKey: string,
  nextProp: ?Function,
) {
  if (__DEV__) {
    warning(
      nextProp === null || typeof nextProp === 'function',
      'Invalid event handler for `%s`. ' +
        'The supplied listener must be of type function.',
      propKey,
    );
  }

  let name = (propKey = propKey.replace(/Capture$/, ''));
  const useCapture = propKey !== name;
  const useCaptureIndex = useCapture ? CAPTURE_INDEX : BUBBLE_INDEX;
  name = nativeEventNameForPropKey(element, name);

  // Set up listener map.
  const listeners =
    element[REACT_EVENT_LISTENERS] || (element[REACT_EVENT_LISTENERS] = {});
  if (!listeners[name]) {
    listeners[name] = [null, null];
  }

  const proxy = useCapture ? captureEventProxy : bubbleEventProxy;

  if (nextProp) {
    if (!element[REACT_EVENT_LISTENERS][name][useCaptureIndex]) {
      element.addEventListener(name, proxy, useCapture);
    }
  } else {
    element.removeEventListener(name, proxy, useCapture);
  }

  listeners[name][useCaptureIndex] = nextProp;
}

/**
 * Returns the appropriate native event name for the react propKey
 */
function nativeEventNameForPropKey(element: Element, propKey: string) {
  switch (propKey) {
    case 'onChange': {
      if (shouldUseChange(element)) {
        return 'change';
      } else {
        return 'input';
      }
    }
    case 'onDoubleClick':
      return 'dblclick';
    default:
      return propKey.toLowerCase().substring(2);
  }
}

/**
 * input should fire for check boxes and radio buttons but it does not do so
 * because of history reasons. We use change there instead.
 * @see https://developer.mozilla.org/en-US/docs/Web/Events/input
 */
function shouldUseChange(element) {
  const nodeName = element.nodeName;
  return (
    nodeName &&
    nodeName.toLowerCase() === 'input' &&
    (element.type === 'checkbox' || element.type === 'radio')
  );
}

/**
 * We install a proxy event handler to avoid updating the event listeners on
 * change.
 */
function createEventProxy(index: number) {
  return function EventProxy(event: Event) {
    if (this.disabled) {
      return;
    }

    this[REACT_EVENT_LISTENERS][event.type][BUBBLE_INDEX](event);
  };
}

const bubbleEventProxy = createEventProxy(BUBBLE_INDEX);
const captureEventProxy = createEventProxy(CAPTURE_INDEX);
