export const mapSchema = async (intentData, userQuery) => {
    return new Promise(resolve => setTimeout(() => resolve({
        mappedFields: ["marks", "status"],
        targetCollection: "students"
    }), 400));
};
