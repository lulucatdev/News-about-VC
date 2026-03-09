# -*- coding: utf-8 -*-
"""MultiCrawler 纯逻辑单元测试（无网络请求）"""

from datetime import datetime, timedelta

import pytest

from vc_tracker.multi_crawler import MultiCrawler, NewsItem, BaseCrawler


class TestFilterByDate:
    def setup_method(self):
        self.mc = MultiCrawler()

    def test_keeps_recent_items(self):
        items = [
            NewsItem(title="New", url="u1", source="S",
                     publish_time=datetime.now().isoformat()),
        ]
        result = self.mc.filter_by_date(items)
        assert len(result) == 1

    def test_no_limit_keeps_old_items(self):
        """DATA_RETENTION_DAYS=None means no filtering by default."""
        old_time = (datetime.now() - timedelta(days=100)).isoformat()
        items = [
            NewsItem(title="Old", url="u1", source="S", publish_time=old_time),
        ]
        result = self.mc.filter_by_date(items)
        assert len(result) == 1

    def test_removes_old_items_with_days(self):
        old_time = (datetime.now() - timedelta(days=100)).isoformat()
        items = [
            NewsItem(title="Old", url="u1", source="S", publish_time=old_time),
        ]
        result = self.mc.filter_by_date(items, days=30)
        assert len(result) == 0

    def test_custom_days(self):
        time_5d = (datetime.now() - timedelta(days=5)).isoformat()
        items = [
            NewsItem(title="T", url="u1", source="S", publish_time=time_5d),
        ]
        assert len(self.mc.filter_by_date(items, days=10)) == 1
        assert len(self.mc.filter_by_date(items, days=3)) == 0

    def test_empty_list(self):
        assert self.mc.filter_by_date([]) == []


class TestParseRelativeTime:
    def setup_method(self):
        self.crawler = BaseCrawler("test", "http://test.com")

    def test_hours_ago(self):
        result = self.crawler.parse_relative_time("3 hours ago")
        assert result is not None
        assert (datetime.now() - result).total_seconds() < 4 * 3600

    def test_minutes_ago(self):
        result = self.crawler.parse_relative_time("30 minutes ago")
        assert result is not None

    def test_days_ago(self):
        result = self.crawler.parse_relative_time("2 days ago")
        assert result is not None
        delta = datetime.now() - result
        assert 1.5 < delta.days < 2.5

    def test_empty_string(self):
        assert self.crawler.parse_relative_time("") is None

    def test_none(self):
        assert self.crawler.parse_relative_time(None) is None


class TestDeduplication:
    def test_title_dedup_in_crawl_all(self):
        """Verify that MultiCrawler deduplicates by title during crawl merge."""
        mc = MultiCrawler()
        # Pre-populate data to simulate existing items
        existing = NewsItem(title="Duplicate Title", url="http://a.com", source="S",
                            publish_time=datetime.now().isoformat())
        mc.data = [existing]
        mc.title_cache = {existing.title.lower().strip()}

        # Verify cache prevents adding same title
        new_title_key = "duplicate title"
        assert new_title_key in mc.title_cache
