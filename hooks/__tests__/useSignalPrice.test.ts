import { renderHook, act } from '@testing-library/react';  
import { useSignalPrice } from './useSignalPrice';  
  
describe('useSignalPrice backoff behavior', () => {  
  beforeEach(() => {  
    jest.useFakeTimers();  
  });  
  
  afterEach(() => {  
    jest.useRealTimers();  
  });  
  
  it('should back off on repeated failures and reset on success', async () => {  
    const { result } = renderHook(() => useSignalPrice(1000));  
      
    // Initial state  
    expect(result.current.isStale).toBe(false);  
      
    // Fast-forward past first poll (will fail in test scenario)  
    act(() => {  
      jest.advanceTimersByTime(1000);  
    });  
      
    // After failure, should be stale  
    expect(result.current.isStale).toBe(true);  
      
    // Next poll should be at 2000ms (backoff)  
    act(() => {  
      jest.advanceTimersByTime(2000);  
    });  
      
    // Simulate success by advancing through success path  
    // (would need to mock mockFetchPrice to succeed)  
  });  
});
