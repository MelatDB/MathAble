/**
 * useVoiceNavActions — registers page-specific action handlers with VoiceNavProvider.
 *
 * Pages call this on mount with a handlers object.  When voice navigation
 * dispatches an action (READ_SOLUTION, SUBMIT, NEXT, etc.) the corresponding
 * handler is called.
 *
 * Usage:
 *   useVoiceNavActions({
 *     readQuestion:  () => speak(currentQ.prompt_spoken),
 *     submitAnswer:  () => submit(),
 *     nextQuestion:  () => nextQuestion(),
 *     readSolution:  () => readFullSolution(),
 *   });
 *
 * All handler keys are optional.  Pass only what is relevant on the current page.
 */
import { useEffect } from "react";
import { useVoiceNav } from "./VoiceNavProvider";

export function useVoiceNavActions(handlers) {
  const { registerActions } = useVoiceNav();

  useEffect(() => {
    const deregister = registerActions(handlers);
    return deregister;
    // Intentionally pass a stable ref or memoized object to avoid constant re-registration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
