/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {getLowestCommonAncestor, isAncestor} from 'shared/ReactTreeTraversal';

import {
  executeDirectDispatch,
  hasDispatches,
  executeDispatchesInOrderStopAtTrue,
  getInstanceFromNode,
} from './EventPluginUtils';
import {
  accumulateDirectDispatches,
  accumulateTwoPhaseDispatches,
  accumulateTwoPhaseDispatchesSkipTarget,
} from './EventPropagators';
import ResponderSyntheticEvent from './ResponderSyntheticEvent';
import accumulate from './accumulate';
import createResponderTouchHistoryStore from './createResponderTouchHistoryStore';

import type {TopLevelType} from './TopLevelEventTypes';
import type {AnyNativeEvent} from './PluginModuleType';
import type {Fiber} from 'react-reconciler/src/ReactFiber';

/**
 *
 * Responder System:
 * ----------------
 *
 * - A global, solitary "interaction lock" on a view.
 * - If a node becomes the responder, it should convey visual feedback
 *   immediately to indicate so, either by highlighting or moving accordingly.
 * - To be the responder means, that touches are exclusively important to that
 *   responder view, and no other view.
 * - While touches are still occurring, the responder lock can be transferred to
 *   a new view, but only to increasingly "higher" views (meaning ancestors of
 *   the current responder).
 *
 * Responder being granted:
 * ------------------------
 *
 * - Touch starts, moves, and scrolls can cause an ID to become the responder.
 * - We capture/bubble `startShouldSetResponder`/`moveShouldSetResponder` to
 *   the "appropriate place".
 * - If nothing is currently the responder, the "appropriate place" is the
 *   initiating event's `targetID`.
 * - If something *is* already the responder, the "appropriate place" is the
 *   first common ancestor of the event target and the current `responderInst`.
 * - Some negotiation happens: See the timing diagram below.
 * - Scrolled views automatically become responder. The reasoning is that a
 *   platform scroll view that isn't built on top of the responder system has
 *   began scrolling, and the active responder must now be notified that the
 *   interaction is no longer locked to it - the system has taken over.
 *
 * - Responder being released:
 *   As soon as no more touches that *started* inside of descendants of the
 *   *current* responderInst, an `onResponderRelease` event is dispatched to the
 *   current responder, and the responder lock is released.
 *
 * TODO:
 * - on "end", a callback hook for `onResponderEndShouldRemainResponder` that
 *   determines if the responder lock should remain.
 * - If a view shouldn't "remain" the responder, any active touches should by
 *   default be considered "dead" and do not influence future negotiations or
 *   bubble paths. It should be as if those touches do not exist.
 * -- For multitouch: Usually a translate-z will choose to "remain" responder
 *  after one out of many touches ended. For translate-y, usually the view
 *  doesn't wish to "remain" responder after one of many touches end.
 * - Consider building this on top of a `stopPropagation` model similar to
 *   `W3C` events.
 * - Ensure that `onResponderTerminate` is called on touch cancels, whether or
 *   not `onResponderTerminationRequest` returns `true` or `false`.
 *
 */

/*                                             Negotiation Performed
                                             +-----------------------+
                                            /                         \
Process low level events to    +     Current Responder      +   wantsResponderID
determine who to perform negot-|   (if any exists at all)   |
iation/transition              | Otherwise just pass through|
-------------------------------+----------------------------+------------------+
Bubble to find first ID        |                            |
to return true:wantsResponderID|                            |
                               |                            |
     +-------------+           |                            |
     | onTouchStart|           |                            |
     +------+------+     none  |                            |
            |            return|                            |
+-----------v-------------+true| +------------------------+ |
|onStartShouldSetResponder|----->|onResponderStart (cur)  |<-----------+
+-----------+-------------+    | +------------------------+ |          |
            |                  |                            | +--------+-------+
            | returned true for|       false:REJECT +-------->|onResponderReject
            | wantsResponderID |                    |       | +----------------+
            | (now attempt     | +------------------+-----+ |
            |  handoff)        | |   onResponder          | |
            +------------------->|      TerminationRequest| |
                               | +------------------+-----+ |
                               |                    |       | +----------------+
                               |         true:GRANT +-------->|onResponderGrant|
                               |                            | +--------+-------+
                               | +------------------------+ |          |
                               | |   onResponderTerminate |<-----------+
                               | +------------------+-----+ |
                               |                    |       | +----------------+
                               |                    +-------->|onResponderStart|
                               |                            | +----------------+
Bubble to find first ID        |                            |
to return true:wantsResponderID|                            |
                               |                            |
     +-------------+           |                            |
     | onTouchMove |           |                            |
     +------+------+     none  |                            |
            |            return|                            |
+-----------v-------------+true| +------------------------+ |
|onMoveShouldSetResponder |----->|onResponderMove (cur)   |<-----------+
+-----------+-------------+    | +------------------------+ |          |
            |                  |                            | +--------+-------+
            | returned true for|       false:REJECT +-------->|onResponderRejec|
            | wantsResponderID |                    |       | +----------------+
            | (now attempt     | +------------------+-----+ |
            |  handoff)        | |   onResponder          | |
            +------------------->|      TerminationRequest| |
                               | +------------------+-----+ |
                               |                    |       | +----------------+
                               |         true:GRANT +-------->|onResponderGrant|
                               |                            | +--------+-------+
                               | +------------------------+ |          |
                               | |   onResponderTerminate |<-----------+
                               | +------------------+-----+ |
                               |                    |       | +----------------+
                               |                    +-------->|onResponderMove |
                               |                            | +----------------+
                               |                            |
                               |                            |
      Some active touch started|                            |
      inside current responder | +------------------------+ |
      +------------------------->|      onResponderEnd    | |
      |                        | +------------------------+ |
  +---+---------+              |                            |
  | onTouchEnd  |              |                            |
  +---+---------+              |                            |
      |                        | +------------------------+ |
      +------------------------->|     onResponderEnd     | |
      No active touches started| +-----------+------------+ |
      inside current responder |             |              |
                               |             v              |
                               | +------------------------+ |
                               | |    onResponderRelease  | |
                               | +------------------------+ |
                               |                            |
                               +                            + */

/**
 * A note about event ordering in the `EventPluginHub`.
 *
 * Suppose plugins are injected in the following order:
 *
 * `[R, S, C]`
 *
 * To help illustrate the example, assume `S` is `SimpleEventPlugin` (for
 * `onClick` etc) and `R` is `ResponderEventPlugin`.
 *
 * "Deferred-Dispatched Events":
 *
 * - The current event plugin system will traverse the list of injected plugins,
 *   in order, and extract events by collecting the plugin's return value of
 *   `extractEvents()`.
 * - These events that are returned from `extractEvents` are "deferred
 *   dispatched events".
 * - When returned from `extractEvents`, deferred-dispatched events contain an
 *   "accumulation" of deferred dispatches.
 * - These deferred dispatches are accumulated/collected before they are
 *   returned, but processed at a later time by the `EventPluginHub` (hence the
 *   name deferred).
 *
 * In the process of returning their deferred-dispatched events, event plugins
 * themselves can dispatch events on-demand without returning them from
 * `extractEvents`. Plugins might want to do this, so that they can use event
 * dispatching as a tool that helps them decide which events should be extracted
 * in the first place.
 *
 * "On-Demand-Dispatched Events":
 *
 * - On-demand-dispatched events are not returned from `extractEvents`.
 * - On-demand-dispatched events are dispatched during the process of returning
 *   the deferred-dispatched events.
 * - They should not have side effects.
 * - They should be avoided, and/or eventually be replaced with another
 *   abstraction that allows event plugins to perform multiple "rounds" of event
 *   extraction.
 *
 * Therefore, the sequence of event dispatches becomes:
 *
 * - `R`s on-demand events (if any)   (dispatched by `R` on-demand)
 * - `S`s on-demand events (if any)   (dispatched by `S` on-demand)
 * - `C`s on-demand events (if any)   (dispatched by `C` on-demand)
 * - `R`s extracted events (if any)   (dispatched by `EventPluginHub`)
 * - `S`s extracted events (if any)   (dispatched by `EventPluginHub`)
 * - `C`s extracted events (if any)   (dispatched by `EventPluginHub`)
 *
 * In the case of `ResponderEventPlugin`: If the `startShouldSetResponder`
 * on-demand dispatch returns `true` (and some other details are satisfied) the
 * `onResponderGrant` deferred dispatched event is returned from
 * `extractEvents`. The sequence of dispatch executions in this case
 * will appear as follows:
 *
 * - `startShouldSetResponder` (`ResponderEventPlugin` dispatches on-demand)
 * - `touchStartCapture`       (`EventPluginHub` dispatches as usual)
 * - `touchStart`              (`EventPluginHub` dispatches as usual)
 * - `responderGrant/Reject`   (`EventPluginHub` dispatches as usual)
 */

type GlobalResponderHandlerType = {
  onChange: (from: any, to: any, blockNativeResponder: any) => void,
};

type GlobalInteractionHandlerType = {
  onChange: (numberActiveTouches: number) => void,
};

export default function createResponderEventPlugin(TopLevelTypes: {
  topMouseDown: TopLevelType,
  topMouseMove: TopLevelType,
  topMouseUp: TopLevelType,
  topScroll: TopLevelType,
  topSelectionChange: TopLevelType,
  topTouchCancel: TopLevelType,
  topTouchEnd: TopLevelType,
  topTouchMove: TopLevelType,
  topTouchStart: TopLevelType,
}) {
  function isStartish(topLevelType) {
    return (
      topLevelType === TopLevelTypes.topMouseDown ||
      topLevelType === TopLevelTypes.topTouchStart
    );
  }

  function isMoveish(topLevelType) {
    return (
      topLevelType === TopLevelTypes.topMouseMove ||
      topLevelType === TopLevelTypes.topTouchMove
    );
  }

  function isEndish(topLevelType) {
    return (
      topLevelType === TopLevelTypes.topMouseUp ||
      topLevelType === TopLevelTypes.topTouchEnd ||
      topLevelType === TopLevelTypes.topTouchCancel
    );
  }

  const ResponderTouchHistoryStore = createResponderTouchHistoryStore(
    isStartish,
    isMoveish,
    isEndish,
  );

  /**
   * Instance of element that should respond to touch/move types of interactions,
   * as indicated explicitly by relevant callbacks.
   */
  let responderInst = null;

  /**
   * Count of current touches. A textInput should become responder iff the
   * selection changes while there is a touch on the screen.
   */
  let trackedTouchCount = 0;

  /**
   * Last reported number of active touches.
   */
  let previousActiveTouches = 0;

  const changeResponder = function(nextResponderInst, blockHostResponder) {
    const oldResponderInst = responderInst;
    responderInst = nextResponderInst;
    if (ResponderEventPlugin.GlobalResponderHandler !== null) {
      ResponderEventPlugin.GlobalResponderHandler.onChange(
        oldResponderInst,
        nextResponderInst,
        blockHostResponder,
      );
    }
  };

  const startDependencies = [
    TopLevelTypes.topTouchStart,
    TopLevelTypes.topMouseDown,
  ];
  const moveDependencies = [
    TopLevelTypes.topTouchMove,
    TopLevelTypes.topMouseMove,
  ];
  const endDependencies = [
    TopLevelTypes.topTouchCancel,
    TopLevelTypes.topTouchEnd,
    TopLevelTypes.topMouseUp,
  ];

  const eventTypes = {
    /**
     * On a `touchStart`/`mouseDown`, is it desired that this element become the
     * responder?
     */
    onStartShouldSetResponder: {
      phasedRegistrationNames: {
        bubbled: 'onStartShouldSetResponder',
        captured: 'onStartShouldSetResponderCapture',
      },
      dependencies: startDependencies,
    },

    /**
     * On a `scroll`, is it desired that this element become the responder? This
     * is usually not needed, but should be used to retroactively infer that a
     * `touchStart` had occurred during momentum scroll. During a momentum scroll,
     * a touch start will be immediately followed by a scroll event if the view is
     * currently scrolling.
     *
     * TODO: This shouldn't bubble.
     */
    onScrollShouldSetResponder: {
      phasedRegistrationNames: {
        bubbled: 'onScrollShouldSetResponder',
        captured: 'onScrollShouldSetResponderCapture',
      },
      dependencies: [TopLevelTypes.topScroll],
    },

    /**
     * On text selection change, should this element become the responder? This
     * is needed for text inputs or other views with native selection, so the
     * JS view can claim the responder.
     *
     * TODO: This shouldn't bubble.
     */
    onSelectionChangeShouldSetResponder: {
      phasedRegistrationNames: {
        bubbled: 'onSelectionChangeShouldSetResponder',
        captured: 'onSelectionChangeShouldSetResponderCapture',
      },
      dependencies: [TopLevelTypes.topSelectionChange],
    },

    /**
     * On a `touchMove`/`mouseMove`, is it desired that this element become the
     * responder?
     */
    onMoveShouldSetResponder: {
      phasedRegistrationNames: {
        bubbled: 'onMoveShouldSetResponder',
        captured: 'onMoveShouldSetResponderCapture',
      },
      dependencies: moveDependencies,
    },

    /**
     * Direct responder events dispatched directly to responder. Do not bubble.
     */
    onResponderStart: {
      registrationName: 'onResponderStart',
      dependencies: startDependencies,
    },
    onResponderMove: {
      registrationName: 'onResponderMove',
      dependencies: moveDependencies,
    },
    onResponderEnd: {
      registrationName: 'onResponderEnd',
      dependencies: endDependencies,
    },
    onResponderRelease: {
      registrationName: 'onResponderRelease',
      dependencies: [],
    },
    onResponderTerminationRequest: {
      registrationName: 'onResponderTerminationRequest',
      dependencies: [],
    },
    onResponderGrant: {registrationName: 'onResponderGrant', dependencies: []},
    onResponderReject: {registrationName: 'onResponderReject', dependencies: []},
    onResponderTerminate: {
      registrationName: 'onResponderTerminate',
      dependencies: [],
    },
  };

  function setResponderAndExtractTransfer(
    topLevelType: TopLevelType,
    targetInst: Fiber,
    nativeEvent: AnyNativeEvent,
    nativeEventTarget: EventTarget,
  ) {
    const shouldSetEventType = isStartish(topLevelType)
      ? eventTypes.onStartShouldSetResponder
      : isMoveish(topLevelType)
        ? eventTypes.onMoveShouldSetResponder
        : topLevelType === TopLevelTypes.topSelectionChange
          ? eventTypes.onSelectionChangeShouldSetResponder
          : eventTypes.onScrollShouldSetResponder;

    // TODO: stop one short of the current responder.
    const bubbleShouldSetFrom = !responderInst
      ? targetInst
      : getLowestCommonAncestor(responderInst, targetInst);

    // When capturing/bubbling the "shouldSet" event, we want to skip the target
    // (deepest ID) if it happens to be the current responder. The reasoning:
    // It's strange to get an `onMoveShouldSetResponder` when you're *already*
    // the responder.
    const skipOverBubbleShouldSetFrom = bubbleShouldSetFrom === responderInst;
    const shouldSetEvent = ResponderSyntheticEvent.getPooled(
      shouldSetEventType,
      bubbleShouldSetFrom,
      nativeEvent,
      nativeEventTarget,
    );
    shouldSetEvent.touchHistory = ResponderTouchHistoryStore.touchHistory;
    if (skipOverBubbleShouldSetFrom) {
      accumulateTwoPhaseDispatchesSkipTarget(shouldSetEvent);
    } else {
      accumulateTwoPhaseDispatches(shouldSetEvent);
    }
    const wantsResponderInst = executeDispatchesInOrderStopAtTrue(
      shouldSetEvent,
    );
    if (!shouldSetEvent.isPersistent()) {
      shouldSetEvent.constructor.release(shouldSetEvent);
    }

    if (!wantsResponderInst || wantsResponderInst === responderInst) {
      return null;
    }
    let extracted;
    const grantEvent = ResponderSyntheticEvent.getPooled(
      eventTypes.onResponderGrant,
      wantsResponderInst,
      nativeEvent,
      nativeEventTarget,
    );
    grantEvent.touchHistory = ResponderTouchHistoryStore.touchHistory;

    accumulateDirectDispatches(grantEvent);
    const blockHostResponder = executeDirectDispatch(grantEvent) === true;
    if (responderInst) {
      const terminationRequestEvent = ResponderSyntheticEvent.getPooled(
        eventTypes.onResponderTerminationRequest,
        responderInst,
        nativeEvent,
        nativeEventTarget,
      );
      terminationRequestEvent.touchHistory =
        ResponderTouchHistoryStore.touchHistory;
      accumulateDirectDispatches(terminationRequestEvent);
      const shouldSwitch =
        !hasDispatches(terminationRequestEvent) ||
        executeDirectDispatch(terminationRequestEvent);
      if (!terminationRequestEvent.isPersistent()) {
        terminationRequestEvent.constructor.release(terminationRequestEvent);
      }

      if (shouldSwitch) {
        const terminateEvent = ResponderSyntheticEvent.getPooled(
          eventTypes.onResponderTerminate,
          responderInst,
          nativeEvent,
          nativeEventTarget,
        );
        terminateEvent.touchHistory = ResponderTouchHistoryStore.touchHistory;
        accumulateDirectDispatches(terminateEvent);
        extracted = accumulate(extracted, [grantEvent, terminateEvent]);
        changeResponder(wantsResponderInst, blockHostResponder);
      } else {
        const rejectEvent = ResponderSyntheticEvent.getPooled(
          eventTypes.onResponderReject,
          wantsResponderInst,
          nativeEvent,
          nativeEventTarget,
        );
        rejectEvent.touchHistory = ResponderTouchHistoryStore.touchHistory;
        accumulateDirectDispatches(rejectEvent);
        extracted = accumulate(extracted, rejectEvent);
      }
    } else {
      extracted = accumulate(extracted, grantEvent);
      changeResponder(wantsResponderInst, blockHostResponder);
    }
    return extracted;
  }

  /**
   * A transfer is a negotiation between a currently set responder and the next
   * element to claim responder status. Any start event could trigger a transfer
   * of responderInst. Any move event could trigger a transfer.
   *
   * @param {number} topLevelType Number from `TopLevelEventTypes`.
   * @return {boolean} True if a transfer of responder could possibly occur.
   */
  function canTriggerTransfer(topLevelType, topLevelInst, nativeEvent) {
    return (
      topLevelInst &&
      // responderIgnoreScroll: We are trying to migrate away from specifically
      // tracking native scroll events here and responderIgnoreScroll indicates we
      // will send topTouchCancel to handle canceling touch events instead
      ((topLevelType === TopLevelTypes.topScroll &&
        !nativeEvent.responderIgnoreScroll) ||
        (trackedTouchCount > 0 &&
          topLevelType === TopLevelTypes.topSelectionChange) ||
        isStartish(topLevelType) ||
        isMoveish(topLevelType))
    );
  }

  /**
   * Returns whether or not this touch end event makes it such that there are no
   * longer any touches that started inside of the current `responderInst`.
   *
   * @param {NativeEvent} nativeEvent Native touch end event.
   * @return {boolean} Whether or not this touch end event ends the responder.
   */
  function noResponderTouches(nativeEvent: any) {
    const touches = nativeEvent.touches;
    if (!touches || touches.length === 0) {
      return true;
    }
    for (let i = 0; i < touches.length; i++) {
      const activeTouch = touches[i];
      const target = activeTouch.target;
      if (target !== null && target !== undefined && target !== 0) {
        // Is the original touch location inside of the current responder?
        const targetInst = getInstanceFromNode(target);
        if (isAncestor(responderInst, targetInst)) {
          return false;
        }
      }
    }
    return true;
  }

  const ResponderEventPlugin = {
    /* For unit testing only */
    _getResponder: function() {
      return responderInst;
    },

    eventTypes: eventTypes,

    /**
     * We must be resilient to `targetInst` being `null` on `touchMove` or
     * `touchEnd`. On certain platforms, this means that a native scroll has
     * assumed control and the original touch targets are destroyed.
     */
    extractEvents: function(
      topLevelType: TopLevelType,
      targetInst: Fiber,
      nativeEvent: AnyNativeEvent,
      nativeEventTarget: EventTarget,
    ): any {
      if (isStartish(topLevelType)) {
        trackedTouchCount += 1;
      } else if (isEndish(topLevelType)) {
        if (trackedTouchCount >= 0) {
          trackedTouchCount -= 1;
        } else {
          console.error(
            'Ended a touch event which was not counted in `trackedTouchCount`.',
          );
          return null;
        }
      }

      ResponderTouchHistoryStore.recordTouchTrack(
        topLevelType,
        (nativeEvent: any),
      );

      let extracted = canTriggerTransfer(topLevelType, targetInst, nativeEvent)
        ? setResponderAndExtractTransfer(
            topLevelType,
            targetInst,
            nativeEvent,
            nativeEventTarget,
          )
        : null;
      // Responder may or may not have transferred on a new touch start/move.
      // Regardless, whoever is the responder after any potential transfer, we
      // direct all touch start/move/ends to them in the form of
      // `onResponderMove/Start/End`. These will be called for *every* additional
      // finger that move/start/end, dispatched directly to whoever is the
      // current responder at that moment, until the responder is "released".
      //
      // These multiple individual change touch events are are always bookended
      // by `onResponderGrant`, and one of
      // (`onResponderRelease/onResponderTerminate`).
      const isResponderTouchStart = responderInst && isStartish(topLevelType);
      const isResponderTouchMove = responderInst && isMoveish(topLevelType);
      const isResponderTouchEnd = responderInst && isEndish(topLevelType);
      const incrementalTouch = isResponderTouchStart
        ? eventTypes.onResponderStart
        : isResponderTouchMove
          ? eventTypes.onResponderMove
          : isResponderTouchEnd ? eventTypes.onResponderEnd : null;

      if (incrementalTouch) {
        const gesture = ResponderSyntheticEvent.getPooled(
          incrementalTouch,
          responderInst,
          nativeEvent,
          nativeEventTarget,
        );
        gesture.touchHistory = ResponderTouchHistoryStore.touchHistory;
        accumulateDirectDispatches(gesture);
        extracted = accumulate(extracted, gesture);
      }

      const isResponderTerminate =
        responderInst && topLevelType === TopLevelTypes.topTouchCancel;
      const isResponderRelease =
        responderInst &&
        !isResponderTerminate &&
        isEndish(topLevelType) &&
        noResponderTouches(nativeEvent);
      const finalTouch = isResponderTerminate
        ? eventTypes.onResponderTerminate
        : isResponderRelease ? eventTypes.onResponderRelease : null;
      if (finalTouch) {
        const finalEvent = ResponderSyntheticEvent.getPooled(
          finalTouch,
          responderInst,
          nativeEvent,
          nativeEventTarget,
        );
        finalEvent.touchHistory = ResponderTouchHistoryStore.touchHistory;
        accumulateDirectDispatches(finalEvent);
        extracted = accumulate(extracted, finalEvent);
        changeResponder(null);
      }

      const numberActiveTouches =
        ResponderTouchHistoryStore.touchHistory.numberActiveTouches;
      if (
        ResponderEventPlugin.GlobalInteractionHandler &&
        numberActiveTouches !== previousActiveTouches
      ) {
        ResponderEventPlugin.GlobalInteractionHandler.onChange(
          numberActiveTouches,
        );
      }
      previousActiveTouches = numberActiveTouches;

      return extracted;
    },

    GlobalResponderHandler: (null: null | GlobalResponderHandlerType),
    GlobalInteractionHandler: (null: null | GlobalInteractionHandlerType),

    injection: {
      /**
       * @param {{onChange: (ReactID, ReactID) => void} GlobalResponderHandler
       * Object that handles any change in responder. Use this to inject
       * integration with an existing touch handling system etc.
       */
      injectGlobalResponderHandler: function(
        GlobalResponderHandler: GlobalResponderHandlerType,
      ) {
        ResponderEventPlugin.GlobalResponderHandler = GlobalResponderHandler;
      },

      /**
       * @param {{onChange: (numberActiveTouches) => void} GlobalInteractionHandler
       * Object that handles any change in the number of active touches.
       */
      injectGlobalInteractionHandler: function(
        GlobalInteractionHandler: GlobalInteractionHandlerType,
      ) {
        ResponderEventPlugin.GlobalInteractionHandler = GlobalInteractionHandler;
      },
    },
  };

  return {
    ResponderEventPlugin,
    ResponderTouchHistoryStore,
  };
}
