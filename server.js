const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static('public'));

// KBO 공식 홈페이지에서 선수 검색
app.get('/api/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: '검색어를 입력해주세요.' });
    }

    // KBO 공식 홈페이지 검색 API URL (예시 URL, 실제 KBO API에 맞게 수정 필요)
    const searchUrl = `https://www.koreabaseball.com/Player/FindPlayer/FindPlayerAjax.aspx?keyword=${encodeURIComponent(query)}`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    // HTML 파싱 (실제 KBO 홈페이지 구조에 맞게 수정 필요)
    const $ = cheerio.load(response.data);
    const players = [];

    // 예시: 검색 결과에서 선수 정보 추출
    $('.player-list .player-item').each((i, element) => {
      const player = {
        id: $(element).data('player-id'),
        name: $(element).find('.player-name').text().trim(),
        team: $(element).find('.player-team').text().trim(),
        position: $(element).find('.player-position').text().trim(),
        image: $(element).find('.player-image').attr('src')
      };
      players.push(player);
    });

    res.json(players);
  } catch (error) {
    console.error('Error searching players:', error);
    res.status(500).json({ error: '선수 검색 중 오류가 발생했습니다.' });
  }
});

// 선수 상세 정보 및 기록 조회
app.get('/api/player/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { season = new Date().getFullYear() } = req.query;

    // KBO 공식 홈페이지 선수 상세 페이지 URL (예시 URL, 실제 KBO API에 맞게 수정 필요)
    const playerUrl = `https://www.koreabaseball.com/Player/PlayerInfo/PlayerDetailInfo.aspx?playerId=${id}`;
    
    const response = await axios.get(playerUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    // HTML 파싱 (실제 KBO 홈페이지 구조에 맞게 수정 필요)
    const $ = cheerio.load(response.data);
    
    // 선수 기본 정보 추출
    const playerInfo = {
      id,
      name: $('.player-name').text().trim(),
      team: $('.player-team').text().trim(),
      position: $('.player-position').text().trim(),
      birth: $('.player-birth').text().trim(),
      height: $('.player-height').text().trim(),
      weight: $('.player-weight').text().trim(),
      image: $('.player-image').attr('src')
    };

    // 선수 기록 추출 (예시: 타격 기록)
    const stats = [];
    $('.record-table tbody tr').each((i, element) => {
      const columns = $(element).find('td');
      if (columns.length > 0) {
        const stat = {
          season: $(columns[0]).text().trim(),
          team: $(columns[1]).text().trim(),
          G: parseInt($(columns[2]).text().trim(), 10) || 0,
          PA: parseInt($(columns[3]).text().trim(), 10) || 0,
          AB: parseInt($(columns[4]).text().trim(), 10) || 0,
          R: parseInt($(columns[5]).text().trim(), 10) || 0,
          H: parseInt($(columns[6]).text().trim(), 10) || 0,
          '2B': parseInt($(columns[7]).text().trim(), 10) || 0,
          '3B': parseInt($(columns[8]).text().trim(), 10) || 0,
          HR: parseInt($(columns[9]).text().trim(), 10) || 0,
          RBI: parseInt($(columns[10]).text().trim(), 10) || 0,
          SB: parseInt($(columns[11]).text().trim(), 10) || 0,
          CS: parseInt($(columns[12]).text().trim(), 10) || 0,
          BB: parseInt($(columns[13]).text().trim(), 10) || 0,
          HBP: parseInt($(columns[14]).text().trim(), 10) || 0,
          SO: parseInt($(columns[15]).text().trim(), 10) || 0,
          GDP: parseInt($(columns[16]).text().trim(), 10) || 0,
          AVG: parseFloat($(columns[17]).text().trim()) || 0,
          OBP: parseFloat($(columns[18]).text().trim()) || 0,
          SLG: parseFloat($(columns[19]).text().trim()) || 0,
          OPS: parseFloat($(columns[20]).text().trim()) || 0
        };
        stats.push(stat);
      }
    });

    // 현재 시즌 기록만 필터링
    const currentSeasonStats = stats.find(stat => stat.season === season.toString());

    res.json({
      player: playerInfo,
      stats: currentSeasonStats || {},
      career: stats
    });
  } catch (error) {
    console.error('Error fetching player data:', error);
    res.status(500).json({ error: '선수 정보를 불러오는 중 오류가 발생했습니다.' });
  }
});

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({ error: '요청하신 리소스를 찾을 수 없습니다.' });
});

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
