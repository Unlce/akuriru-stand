<?php
require_once __DIR__ . '/auth.php';
adminLogout();
header('Location: /admin/login.php');
exit;
?>
