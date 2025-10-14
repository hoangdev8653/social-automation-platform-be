const express = require("express");
const router = express.Router();
const templateCategoryController = require("../controllers/templatecategory.js");

router.route("/").get(templateCategoryController.getAllTemplateCategory);
router.route("/:id").get(templateCategoryController.getTemplateCategoryById);
router.route("/").post(templateCategoryController.createTemplateCategory);
router.route("/:id").delete(templateCategoryController.deleteTemplateCategory);

module.exports = router;
