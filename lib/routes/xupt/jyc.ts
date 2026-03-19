import { load } from 'cheerio';

import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/jyc/:type?',
    categories: ['university'],
    example: '/xupt/jyc',
    parameters: { type: '分类，默认为 tzgg（通知公告）' },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['jyc.xupt.edu.cn/index/tzgg.htm'],
            target: '/jyc/tzgg',
        },
    ],
    name: '教务处通知公告',
    maintainers: ['StudyingLover'],
    handler,
    description: `| 分类 | 参数 |
| ---- | ---- |
| 通知公告 | tzgg |`,
};

async function handler(ctx) {
    const type = ctx.req.param('type') || 'tzgg';
    const typeDict = {
        tzgg: ['通知公告', 'https://jyc.xupt.edu.cn/index/tzgg.htm'],
    };

    const [typeName, url] = typeDict[type as keyof typeof typeDict] || typeDict.tzgg;

    const response = await ofetch(url);
    const $ = load(response);

    const list = $('.ej_list li')
        .toArray()
        .map((item) => {
            const $item = $(item);
            const $link = $item.find('a').first();
            const $date = $item.find('span i');

            // 处理相对链接，转换为绝对链接
            const linkHref = $link.attr('href') || '';
            const absoluteLink = new URL(linkHref, 'https://jyc.xupt.edu.cn').href;

            // 处理日期格式：<span><i>18</i>/03</span> -> 2025-03-18
            let pubDate: Date | null = null;
            const dayText = $date.first().text().trim();
            const dateSpan = $item.find('span').text().trim();
            const monthMatch = dateSpan.match(/\/(\d+)/);
            if (dayText && monthMatch) {
                const day = dayText.padStart(2, '0');
                const month = monthMatch[1].padStart(2, '0');
                // 假设通知日期是当前学期（如果月份大于8则为当年，否则为去年）
                const currentMonth = new Date().getMonth() + 1;
                const year = currentMonth >= 9 ? new Date().getFullYear() : new Date().getFullYear() - 1;
                pubDate = parseDate(`${year}-${month}-${day}`, 'YYYY-MM-DD');
            }

            return {
                title: $link.text().trim(),
                link: absoluteLink,
                pubDate,
            };
        })
        .filter((item) => item.title && item.link);

    return {
        title: `西安邮电大学教务处 - ${typeName}`,
        link: url,
        item: list,
    };
}
