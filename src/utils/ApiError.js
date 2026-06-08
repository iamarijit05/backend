// Creating a custom error class that extends the built-in JavaScript Error class
class ApiError extends Error {

    // Constructor runs when we do: new ApiError(...)
    constructor(
        statusCode,                 // HTTP status code like 400, 404, 500
        message = "Something Went Wrong", // default error message if none provided
        errors = [],                // array to store detailed validation or other errors
        stack = ""                  // optional custom stack trace
    ) {

        // Call the parent Error class constructor with the message
        // This sets the .message property and creates a basic error object
        super(message);

        // Store HTTP status code (used in API response)
        this.statusCode = statusCode;

        // Usually API errors don’t return data, so we set it to null
        this.data = null;

        // Store the error message again explicitly (useful for API response formatting)
        this.message = message;

        // Always false because this is an error response
        this.success = false;

        // Store extra error details (IMPORTANT: fixed bug from your code)
        // Example: validation errors from MongoDB or Joi
        this.errors = errors;

        // If a custom stack trace is provided, use it
        if (stack) {
            this.stack = stack;
        } 
        else {
            // Otherwise generate a fresh stack trace from where error was thrown
            // This helps in debugging (shows file, line number, call path)
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

// Export the class so it can be used in controllers/services
export { ApiError };