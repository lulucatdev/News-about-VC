# -*- coding: utf-8 -*-
"""NewsItem 纯逻辑单元测试"""

from datetime import datetime, timedelta

import pytest

from vc_tracker.multi_crawler import NewsItem


class TestNewsItemInit:
    def test_default_fields(self):
        item = NewsItem(title="Test", url="https://example.com", source="Test Source",
                        publish_time=datetime.now().isoformat())
        assert item.investors == []
        assert item.crawl_time != ''
        assert item.unique_id != ''

    def test_unique_id_deterministic(self):
        kwargs = dict(title="T", url="https://a.com", source="S",
                      publish_time="2024-01-01T00:00:00")
        a = NewsItem(**kwargs)
        b = NewsItem(**kwargs)
        assert a.unique_id == b.unique_id

    def test_unique_id_differs_for_different_input(self):
        a = NewsItem(title="A", url="https://a.com", source="S",
                     publish_time="2024-01-01T00:00:00")
        b = NewsItem(title="B", url="https://a.com", source="S",
                     publish_time="2024-01-01T00:00:00")
        assert a.unique_id != b.unique_id


class TestGetPublishDatetime:
    def test_iso_format(self):
        item = NewsItem(title="T", url="u", source="S",
                        publish_time="2024-06-15T12:30:00")
        dt = item.get_publish_datetime()
        assert dt == datetime(2024, 6, 15, 12, 30, 0)

    def test_iso_with_z(self):
        item = NewsItem(title="T", url="u", source="S",
                        publish_time="2024-06-15T12:30:00Z")
        dt = item.get_publish_datetime()
        assert dt is not None
        assert dt.year == 2024

    def test_date_only(self):
        item = NewsItem(title="T", url="u", source="S",
                        publish_time="2024-06-15")
        dt = item.get_publish_datetime()
        assert dt == datetime(2024, 6, 15)

    def test_slash_format(self):
        item = NewsItem(title="T", url="u", source="S",
                        publish_time="2024/06/15 08:00:00")
        dt = item.get_publish_datetime()
        assert dt == datetime(2024, 6, 15, 8, 0, 0)

    def test_invalid_returns_none(self):
        item = NewsItem(title="T", url="u", source="S",
                        publish_time="not-a-date")
        assert item.get_publish_datetime() is None


class TestIsWithinDateRange:
    def test_recent_item_is_within(self):
        item = NewsItem(title="T", url="u", source="S",
                        publish_time=datetime.now().isoformat())
        assert item.is_within_date_range() is True

    def test_old_item_no_limit_returns_true(self):
        """days=None (default) means no date filtering — always True."""
        old_time = (datetime.now() - timedelta(days=100)).isoformat()
        item = NewsItem(title="T", url="u", source="S", publish_time=old_time)
        assert item.is_within_date_range() is True

    def test_old_item_with_days_is_not_within(self):
        old_time = (datetime.now() - timedelta(days=100)).isoformat()
        item = NewsItem(title="T", url="u", source="S", publish_time=old_time)
        assert item.is_within_date_range(days=30) is False

    def test_custom_days(self):
        time_5_days_ago = (datetime.now() - timedelta(days=5)).isoformat()
        item = NewsItem(title="T", url="u", source="S", publish_time=time_5_days_ago)
        assert item.is_within_date_range(days=10) is True
        assert item.is_within_date_range(days=3) is False

    def test_invalid_date_no_limit_returns_true(self):
        """days=None (default) means no filtering — invalid date still True."""
        item = NewsItem(title="T", url="u", source="S", publish_time="bad")
        assert item.is_within_date_range() is True

    def test_invalid_date_with_days_returns_true(self):
        """With days set, unparseable date is kept (returns True)."""
        item = NewsItem(title="T", url="u", source="S", publish_time="bad")
        assert item.is_within_date_range(days=30) is True


class TestToDict:
    def test_returns_dict_with_all_fields(self):
        item = NewsItem(title="T", url="u", source="S",
                        publish_time="2024-01-01T00:00:00")
        d = item.to_dict()
        assert isinstance(d, dict)
        assert d['title'] == 'T'
        assert d['url'] == 'u'
        assert d['source'] == 'S'
        assert 'unique_id' in d
        assert 'crawl_time' in d
