<?php
$file = 'scores.json';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (isset($data['pseudo']) && isset($data['score'])) {
        $pseudo = substr(strip_tags(trim($data['pseudo'])), 0, 8);
        $score = intval($data['score']);
        
        $scores = file_exists($file) ? json_decode(file_get_contents($file), true) : [];
        
        $found = false;
        foreach ($scores as &$entry) {
            if ($entry['pseudo'] === $pseudo) {
                if ($score > $entry['score']) {
                    $entry['score'] = $score;
                }
                $found = true;
                break;
            }
        }
        if (!$found) {
            $scores[] = ['pseudo' => $pseudo, 'score' => $score];
        }
        
        usort($scores, function($a, $b) {
            return $b['score'] - $a['score'];
        });
        $scores = array_slice($scores, 0, 10);
        
        file_put_contents($file, json_encode($scores));
        echo json_encode(['status' => 'success']);
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    header('Content-Type: application/json');
    if (file_exists($file)) {
        echo file_get_contents($file);
    } else {
        echo json_encode([]);
    }
    exit;
}
?>