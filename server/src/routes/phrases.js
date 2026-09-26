const express = require('express');
const router = express.Router();
const { PHRASE_CATEGORIES, HOMESTAY_PHRASES } = require('../data/phrasesData');

/**
 * GET /api/phrases
 * Returns all phrase categories and hospitality phrases.
 */
router.get('/', (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      categories: PHRASE_CATEGORIES,
      phrases: HOMESTAY_PHRASES
    });
  } catch (error) {
    console.error('Error fetching phrases:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/phrases/:category
 * Returns phrases for a specific category (e.g., 'welcome', 'food-tea', 'Food & Tea', etc.).
 */
router.get('/:category', (req, res) => {
  try {
    const param = String(req.params.category).toLowerCase().trim().replace(/\s+/g, '-');
    const matchedCategory = PHRASE_CATEGORIES.find(
      (c) => c.id.toLowerCase() === param || c.name.toLowerCase().replace(/\s+/g, '-') === param
    );

    const categoryPhrases = HOMESTAY_PHRASES.filter(
      (p) =>
        p.categoryId.toLowerCase() === param ||
        p.category.toLowerCase().replace(/\s+/g, '-') === param ||
        (matchedCategory && p.categoryId === matchedCategory.id)
    );

    return res.status(200).json({
      success: true,
      category: matchedCategory || { id: param, name: req.params.category },
      phrases: categoryPhrases
    });
  } catch (error) {
    console.error('Error fetching category phrases:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
