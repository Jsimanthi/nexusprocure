import logger from '@/lib/logger';

interface InternalMetrics {
    onTimeDeliveryRate: number; // 0-100
    averageQualityScore: number; // 0-5 (usually) or 0-100
    totalOrders: number;
}

export class SupplierRiskService {
    /**
     * Calculates a holistic Risk Score (0-100) where 100 is CRITICAL RISK.
     */
    static calculateRiskScore(metrics: InternalMetrics, externalRiskFactor: number = 0): number {
        // Invert the positive metrics to get risk
        // Low on-time delivery = High Risk
        const deliveryRisk = Math.max(0, 100 - metrics.onTimeDeliveryRate);

        // Low quality = High Risk (assuming 5 star scale, normalize to 100)
        // 5 stars = 0 risk, 1 star = 80 risk, 0 stars = 100 risk
        const qualityRisk = Math.max(0, 100 - (metrics.averageQualityScore / 5 * 100));

        // Weighting Algorithm
        // Delivery Performance: 40%
        // Quality Performance: 40%
        // External Factors (News/Market): 20%

        const weightedScore = (deliveryRisk * 0.4) + (qualityRisk * 0.4) + (externalRiskFactor * 0.2);

        // Penalize low volume (new vendors are riskier)
        const volumePenalty = metrics.totalOrders < 5 ? 10 : 0;

        const finalScore = Math.min(100, weightedScore + volumePenalty);

        logger.info({ metrics, externalRiskFactor, finalScore }, "Calculated Supplier Risk Score");
        return Math.round(finalScore);
    }

    static getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
        if (score < 20) return 'LOW';
        if (score < 50) return 'MEDIUM';
        if (score < 80) return 'HIGH';
        return 'CRITICAL';
    }
}
