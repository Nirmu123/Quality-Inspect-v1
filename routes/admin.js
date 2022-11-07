const express = require("express");
var router = express.Router();

const adminController = require("../controller/admin");

router.get("/reports", adminController.getReports);

module.exports = router;