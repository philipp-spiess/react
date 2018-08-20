/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export const SyntheticEventNormalizer = {
  // currentTarget is set when dispatching; no use in copying it here
  currentTarget: function() {
    return null;
  },
  timeStamp: function(event) {
    return event.timeStamp || Date.now();
  },
};

function functionThatReturnsTrue() {
  return true;
}

function functionThatReturnsFalse() {
  return false;
}

function getPropertiesForEvent(nativeEvent) {
  let j = 0;
  let includedAllKeys = false;
  let properties = [];
  let obj = nativeEvent;
  while (!includedAllKeys && j < 10) {
    let keys = Object.keys(obj);
    properties = properties.concat(keys);

    if (keys.indexOf('target') !== -1) {
      includedAllKeys = true;
    }

    obj = Object.getPrototypeOf(obj);
    j++;
  }

  if (j >= 10) {
    throw new Error('This should never happen.');
  }

  return properties;
}

export function createSyntheticEventCreator(normalizer) {
  return function createSyntheticCreator(
    dispatchConfig,
    targetInst,
    nativeEvent,
    nativeEventTarget,
  ) {
    const properties = getPropertiesForEvent(nativeEvent);

    const defaultPrevented =
      nativeEvent.defaultPrevented != null
        ? nativeEvent.defaultPrevented
        : nativeEvent.returnValue === false;

    let syntheticEvent = {
      dispatchConfig,
      _targetInst: targetInst,
      nativeEvent,
      isDefaultPrevented: defaultPrevented
        ? functionThatReturnsTrue
        : functionThatReturnsFalse,
      isPropagationStopped: functionThatReturnsFalse,
      preventDefault: function() {
        this.defaultPrevented = true;
        const event = this.nativeEvent;
        if (!event) {
          return;
        }

        if (event.preventDefault) {
          event.preventDefault();
        } else if (typeof event.returnValue !== 'unknown') {
          event.returnValue = false;
        }
        this.isDefaultPrevented = functionThatReturnsTrue;
      },

      stopPropagation: function() {
        const event = this.nativeEvent;
        if (!event) {
          return;
        }

        if (event.stopPropagation) {
          event.stopPropagation();
        } else if (typeof event.cancelBubble !== 'unknown') {
          // The ChangeEventPlugin registers a "propertychange" event for
          // IE. This event does not support bubbling or cancelling, and
          // any references to cancelBubble throw "Member not found".  A
          // typeof check of "unknown" circumvents this issue (and is also
          // IE specific).
          event.cancelBubble = true;
        }

        this.isPropagationStopped = functionThatReturnsTrue;
      },

      // @TODO(philipp): Add deprecation warning and simulate previous behavior
      persist: functionThatReturnsTrue,
      isPersistent: functionThatReturnsTrue,
    };

    for (let i = 0; i < properties.length; i++) {
      let propName = properties[i];

      if (syntheticEvent[propName]) {
        continue;
      }

      const normalize = normalizer[propName];
      if (normalize) {
        syntheticEvent[propName] = normalize(nativeEvent);
      } else {
        if (propName === 'target') {
          syntheticEvent.target = nativeEventTarget;
        } else {
          syntheticEvent[propName] = nativeEvent[propName];
        }
      }
    }
    return syntheticEvent;
  };
}

export const createSyntheticEvent = createSyntheticEventCreator(
  SyntheticEventNormalizer,
);
