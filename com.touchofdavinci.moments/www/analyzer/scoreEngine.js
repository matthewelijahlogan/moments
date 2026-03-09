/**
 * Calculate the average score for each category.
 * @param {number[]} attributes - Array of 50 attribute scores.
 * @returns {Object} - Category scores.
 */
export function calculateCategoryScores(attributes) {
    const categories = {
      visualAppeal: attributes.slice(0, 10),
      emotionalImpact: attributes.slice(10, 20),
      environmentalContext: attributes.slice(20, 30),
      interpersonalRelation: attributes.slice(30, 40),
      aestheticHarmony: attributes.slice(40, 50),
    };
  
    const categoryScores = {};
    for (const [category, scores] of Object.entries(categories)) {
      categoryScores[category] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }
  
    return categoryScores;
  }
  
  /**
   * Calculate the overall score as the average of all category scores.
   * @param {Object} categoryScores - Object containing category scores.
   * @returns {number} - Overall score.
   */
  export function calculateOverallScore(categoryScores) {
    const totalScore = Object.values(categoryScores).reduce((sum, score) => sum + score, 0);
    return totalScore / Object.keys(categoryScores).length;
  }
  