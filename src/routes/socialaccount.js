const express = require("express");
const router = express.Router();
const socialaccountController = require("../controllers/socialaccount.js");

router.route("/").get(socialaccountController.getAllSocialAccounts);
router.route("/:id").get(socialaccountController.getSocialAccountById);
router.route("/").post(socialaccountController.createSocialAccount);
router.route("/:id").put(socialaccountController.updateSocialAccount);
router.route("/:id").delete(socialaccountController.deleteSocialAccount);

module.exports = router;
