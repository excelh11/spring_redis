package com.redis_cache;


import com.redis_cache.SearchService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    @Autowired
    private SearchService searchService;

    @PostMapping
    public ResponseEntity<Map<String, String>> search(@RequestBody Map<String, String> request) {
        String keyword = request.get("keyword");

        if (keyword == null || keyword.trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "검색어를 입력해주세요"));
        }

        searchService.processSearch(keyword.trim());

        return ResponseEntity.ok(Map.of(
                "message", "검색이 완료되었습니다",
                "keyword", keyword
        ));
    }

    @GetMapping("/popular")
    public ResponseEntity<List<String>> getPopularKeywords() {
        List<String> popularKeywords = searchService.getPopularKeywords(10);
        return ResponseEntity.ok(popularKeywords);
    }

    @GetMapping("/recent")
    public ResponseEntity<List<String>> getRecentKeywords() {
        List<String> recentKeywords = searchService.getRecentKeywords(10);
        return ResponseEntity.ok(recentKeywords);
    }
    @GetMapping("/debug/redis-status")
    public ResponseEntity<Map<String, Object>> getRedisStatus() {
        Map<String, Object> status = searchService.getRedisStatus();
        return ResponseEntity.ok(status);
    }

    @GetMapping("/compare/redis-vs-db")
    public ResponseEntity<Map<String, Object>> compareRedisVsDB() {
        Map<String, Object> comparison = searchService.compareRedisVsDB();
        return ResponseEntity.ok(comparison);
    }
}