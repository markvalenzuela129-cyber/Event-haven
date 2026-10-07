<?php

header("Content-Type: application/json");

require_once "backend.php";

try {

    /*
    |--------------------------------------------------------------------------
    | GET - Get all equipment
    |--------------------------------------------------------------------------
    */

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {

        $stmt = $pdo->query("
            SELECT
                id,
                code,
                name,
                category,
                total,
                available,
                status,
                condition_status AS `condition`
            FROM equipment
            ORDER BY id DESC
        ");

        $equipment = $stmt->fetchAll();

        echo json_encode([
            "success" => true,
            "equipment" => $equipment
        ]);

        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | POST - Add equipment
    |--------------------------------------------------------------------------
    */

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {

        $data = json_decode(file_get_contents("php://input"), true);

        $name = trim($data['name'] ?? '');
        $category = trim($data['category'] ?? '');
        $total = intval($data['total'] ?? 0);

        if ($name === '' || $category === '' || $total <= 0) {

            http_response_code(400);

            echo json_encode([
                "success" => false,
                "message" => "Please provide a valid name, category, and total."
            ]);

            exit;
        }

        $code = 'EQ-' . random_int(1000, 9999);

        $stmt = $pdo->prepare("
            INSERT INTO equipment
            (
                code,
                name,
                category,
                total,
                available,
                status,
                condition_status
            )
            VALUES
            (
                :code,
                :name,
                :category,
                :total,
                :available,
                'good',
                'Good'
            )
        ");

        $stmt->execute([
            ':code' => $code,
            ':name' => $name,
            ':category' => $category,
            ':total' => $total,
            ':available' => $total
        ]);

        echo json_encode([
            "success" => true,
            "message" => "Equipment added successfully.",
            "id" => $pdo->lastInsertId()
        ]);

        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | PUT - Edit equipment
    |--------------------------------------------------------------------------
    */

    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {

        $data = json_decode(file_get_contents("php://input"), true);

        $id = intval($data['id'] ?? 0);
        $name = trim($data['name'] ?? '');
        $category = trim($data['category'] ?? '');
        $total = intval($data['total'] ?? 0);

        if ($id <= 0 || $name === '' || $category === '' || $total <= 0) {

            http_response_code(400);

            echo json_encode([
                "success" => false,
                "message" => "Invalid equipment information."
            ]);

            exit;
        }

        /*
         * Get the current equipment first.
         */
        $check = $pdo->prepare("
            SELECT total, available
            FROM equipment
            WHERE id = :id
        ");

        $check->execute([
            ':id' => $id
        ]);

        $current = $check->fetch();

        if (!$current) {

            http_response_code(404);

            echo json_encode([
                "success" => false,
                "message" => "Equipment not found."
            ]);

            exit;
        }

        /*
         * Preserve the number currently rented/out.
         */
        $used = intval($current['total']) - intval($current['available']);

        if ($total < $used) {

            http_response_code(400);

            echo json_encode([
                "success" => false,
                "message" => "Total units cannot be lower than units currently in use."
            ]);

            exit;
        }

        $available = $total - $used;

        $status = 'good';

        if ($available <= 0) {
            $status = 'bad';
        } elseif ($available <= 5) {
            $status = 'warn';
        }

        $stmt = $pdo->prepare("
            UPDATE equipment
            SET
                name = :name,
                category = :category,
                total = :total,
                available = :available,
                status = :status
            WHERE id = :id
        ");

        $stmt->execute([
            ':name' => $name,
            ':category' => $category,
            ':total' => $total,
            ':available' => $available,
            ':status' => $status,
            ':id' => $id
        ]);

        echo json_encode([
            "success" => true,
            "message" => "Equipment updated successfully."
        ]);

        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | DELETE - Remove equipment
    |--------------------------------------------------------------------------
    */

    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {

        $data = json_decode(file_get_contents("php://input"), true);

        $id = intval($data['id'] ?? 0);

        if ($id <= 0) {

            http_response_code(400);

            echo json_encode([
                "success" => false,
                "message" => "Invalid equipment ID."
            ]);

            exit;
        }

        $stmt = $pdo->prepare("
            DELETE FROM equipment
            WHERE id = :id
        ");

        $stmt->execute([
            ':id' => $id
        ]);

        if ($stmt->rowCount() === 0) {

            http_response_code(404);

            echo json_encode([
                "success" => false,
                "message" => "Equipment not found."
            ]);

            exit;
        }

        echo json_encode([
            "success" => true,
            "message" => "Equipment removed successfully."
        ]);

        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | Unsupported request
    |--------------------------------------------------------------------------
    */

    http_response_code(405);

    echo json_encode([
        "success" => false,
        "message" => "Method not allowed."
    ]);

} catch (PDOException $e) {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}