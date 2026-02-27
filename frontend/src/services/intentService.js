export const detectIntent = async (userQuery) => {
    return new Promise(resolve => setTimeout(() => resolve({
        intent: "find",
        confidence: 0.98,
        explanation: "Standard data retrieval detected."
    }), 300));
};
