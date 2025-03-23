'use client'

/**
 * Utility function to handle errors in async operations
 * @param operation The async operation to execute
 * @param errorMessage The error message to log
 * @param fallbackValue The fallback value to return on error
 * @returns The result of the operation or the fallback value
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage: string,
  fallbackValue: T
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    console.error(`${errorMessage}:`, error)
    return fallbackValue
  }
}

/**
 * Utility function to handle errors in async operations with custom error handler
 * @param operation The async operation to execute
 * @param errorHandler The error handler function
 * @returns The result of the operation or the result of the error handler
 */
export async function withCustomErrorHandling<T>(
  operation: () => Promise<T>,
  errorHandler: (error: any) => Promise<T> | T
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    return errorHandler(error)
  }
}

/**
 * Utility function to log errors
 * @param context The context of the error
 * @param error The error object
 */
export function logError(context: string, error: any): void {
  console.error(`Error in ${context}:`, error)
}
