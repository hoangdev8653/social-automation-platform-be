const express = require("express");
const router = express.Router();
const templateController = require("../controllers/template.js");
const validateToken = require("../middlewares/auth.js");

router.route("/").get(templateController.getAllTemplate);
router.route("/:id").get(templateController.getTemplateById);
router.route("/").post(validateToken, templateController.createTemplate);
router.route("/:id").put(templateController.updateTemplate);
router.route("/:id").delete(validateToken, templateController.deleteTemplate);

module.exports = router;
