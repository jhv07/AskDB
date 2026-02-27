export const generateQuery = async (schemaData, userQuery) => {
    return new Promise(resolve => setTimeout(() => resolve({
        query_type: "find",
        collection: "students",
        query: { marks: { $gt: 50 }, status: "Active" }
    }), 800));
};
