export function debounce(func, wait = 500, maxWait) {
  let timeout, maxTimeout;
  let startTime; // Tracks when the first call in a "debounce series" started

  function invokeFunction(args) {
    func(...args);
    // After invoking, reset startTime to allow a new "maxWait" period if calls resume
    startTime = undefined;
  }

  function debounced(...args) {
    const now = Date.now();

    // If this is the first call since last invoke, record start time
    if (!startTime) {
      startTime = now;
    }

    // Clear the normal wait timeout, as we're about to schedule a new one
    clearTimeout(timeout);

    // If maxWait is defined, we also need to handle it
    if (maxWait !== undefined) {
      // Clear any previously set maxWait timeout
      clearTimeout(maxTimeout);

      const elapsed = now - startTime;
      const maxWaitRemaining = maxWait - elapsed;

      // If maxWait time has passed, invoke immediately
      if (maxWaitRemaining <= 0) {
        invokeFunction(args);
        return;
      }

      // Otherwise, schedule a maxWait trigger if function isn't invoked by the wait timer
      maxTimeout = setTimeout(() => {
        invokeFunction(args);
      }, maxWaitRemaining);
    }

    // Schedule the main debounce timer. If calls keep coming in,
    // this timer gets reset until there's a pause
    timeout = setTimeout(() => {
      invokeFunction(args);
    }, wait);
  }

  // Provide a method to clear pending calls
  debounced.clear = () => {
    clearTimeout(timeout);
    clearTimeout(maxTimeout);
    startTime = undefined;
  };

  return debounced;
}
