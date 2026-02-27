import { analyzeQueryRisk } from '../utils/sqlGenerator';

export const analyzeRisk = async (queryObject) => {
    return new Promise(resolve => setTimeout(() => resolve(
        analyzeQueryRisk(queryObject)
    ), 300));
};
