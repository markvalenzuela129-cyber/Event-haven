<?php

header("Content-Type: application/json");

require_once "backend.php";

echo json_encode([
    "success" => true,
    "message" => "Event Haven database connected successfully!"
]);