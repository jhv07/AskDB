import { generateOptimizationSuggestions } from '../utils/sqlGenerator';

export const optimizeQuery = async (queryObject) => {
    return new Promise(resolve => setTimeout(() => resolve(
        generateOptimizationSuggestions(queryObject)
    ), 400));
};
