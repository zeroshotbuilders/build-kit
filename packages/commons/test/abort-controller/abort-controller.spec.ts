import { TimeoutAbortController } from "@zeroshotbuilders/commons";

describe("TimeoutAbortController", () => {
  let setTimeoutSpy: jest.SpyInstance;
  let clearTimeoutSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    setTimeoutSpy = jest.spyOn(global, "setTimeout");
    clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
  });

  afterEach(() => {
    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
    jest.useRealTimers();
  });

  describe("constructor", () => {
    it("should create a new instance with an abort controller", () => {
      const controller = new TimeoutAbortController();
      expect(controller).toBeDefined();
      expect(controller.signal).toBeDefined();
      expect(controller.signal.aborted).toBeFalsy();
    });
  });

  describe("setTimeout", () => {
    it("should set a timeout and return the signal", () => {
      const controller = new TimeoutAbortController();
      const timeoutMs = 5000;
      const signal = controller.setTimeout(timeoutMs);
      expect(signal).toBeDefined();
      expect(signal.aborted).toBeFalsy();
      expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
      expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), timeoutMs);
    });

    it("should clear any existing timeout when setting a new one", () => {
      const controller = new TimeoutAbortController();
      const clearTimeoutSpy = jest.spyOn(controller, "clearTimeout");
      controller.setTimeout(5000);
      controller.setTimeout(10000);
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
    });

    it("should abort after the specified timeout", () => {
      const controller = new TimeoutAbortController();
      const timeoutMs = 5000;
      const signal = controller.setTimeout(timeoutMs);
      jest.advanceTimersByTime(timeoutMs);
      expect(signal.aborted).toBeTruthy();
    });
  });

  describe("clearTimeout", () => {
    it("should clear the timeout", () => {
      const controller = new TimeoutAbortController();
      controller.setTimeout(5000);
      controller.clearTimeout();
      expect(clearTimeoutSpy).toHaveBeenCalled();
      jest.advanceTimersByTime(10000);
      expect(controller.signal.aborted).toBeFalsy();
    });

    it("should do nothing if no timeout is set", () => {
      const controller = new TimeoutAbortController();
      controller.clearTimeout();
      expect(clearTimeoutSpy).not.toHaveBeenCalled();
    });
  });

  describe("signal getter", () => {
    it("should return the abort signal", () => {
      const controller = new TimeoutAbortController();
      const signal = controller.signal;
      expect(signal).toBeDefined();
      expect(signal.aborted).toBeFalsy();
    });
  });

  describe("abort", () => {
    it("should abort the controller", () => {
      const controller = new TimeoutAbortController();
      controller.abort();
      expect(controller.signal.aborted).toBeTruthy();
    });

    it("should clear the timeout when aborting", () => {
      const controller = new TimeoutAbortController();
      const clearTimeoutSpy = jest.spyOn(controller, "clearTimeout");
      controller.setTimeout(5000);
      controller.abort();
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it("should trigger the abort event", () => {
      const controller = new TimeoutAbortController();
      const abortHandler = jest.fn();
      controller.signal.addEventListener("abort", abortHandler);
      controller.abort();
      expect(abortHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe("dispose", () => {
    it("should clear the timeout", () => {
      const controller = new TimeoutAbortController();
      const clearTimeoutSpy = jest.spyOn(controller, "clearTimeout");
      controller.setTimeout(5000);
      controller.dispose();
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it("should remove the abort event listener", () => {
      const controller = new TimeoutAbortController();
      const removeEventListenerSpy = jest.spyOn(controller.signal, "removeEventListener");
      controller.dispose();
      expect(removeEventListenerSpy).toHaveBeenCalledWith("abort", expect.any(Function));
    });
  });

  describe("withTimeout static method", () => {
    it("should create a controller with a timeout", () => {
      const timeoutMs = 5000;
      const { controller, signal } = TimeoutAbortController.withTimeout(timeoutMs);
      expect(controller).toBeInstanceOf(TimeoutAbortController);
      expect(signal).toBeDefined();
      expect(signal.aborted).toBeFalsy();
      expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
      expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), timeoutMs);
    });

    it("should abort after the specified timeout", () => {
      const timeoutMs = 5000;
      const { signal } = TimeoutAbortController.withTimeout(timeoutMs);
      jest.advanceTimersByTime(timeoutMs);
      expect(signal.aborted).toBeTruthy();
    });
  });

  describe("integration tests", () => {
    it("should handle a complete lifecycle", () => {
      const controller = new TimeoutAbortController();
      const signal = controller.setTimeout(5000);
      const abortHandler = jest.fn();
      signal.addEventListener("abort", abortHandler);
      jest.advanceTimersByTime(2000);
      expect(signal.aborted).toBeFalsy();
      expect(abortHandler).not.toHaveBeenCalled();
      controller.abort();
      expect(signal.aborted).toBeTruthy();
      expect(abortHandler).toHaveBeenCalledTimes(1);
      controller.dispose();
      jest.advanceTimersByTime(10000);
      expect(abortHandler).toHaveBeenCalledTimes(1);
    });

    it("should automatically clear timeout when aborted", () => {
      const controller = new TimeoutAbortController();
      const clearTimeoutSpy = jest.spyOn(controller, "clearTimeout");
      controller.setTimeout(5000);
      controller.abort();
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });
});
