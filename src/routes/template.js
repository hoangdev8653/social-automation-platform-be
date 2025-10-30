const express = require("express");
const router = express.Router();
const templateController = require("../controllers/template.js");

router.route("/").get(templateController.getAllTemplate);
router.route("/:id").get(templateController.getTemplateById);
router.route("/").post(templateController.createTemplate);
router.route("/:id").put(templateController.updateTemplate);
router.route("/:id").delete(templateController.deleteTemplate);

module.exports = router;
