(function() {
  'use strict';

  // API 기본 URL (로컬 서버 주소)
  const API_BASE_URL = 'http://localhost:3000';
  const SEASON = new Date().getFullYear(); // 현재 연도

  const $ = (sel) => document.querySelector(sel);
  const playerInput = $('#playerInput');
  const searchBtn = $('#searchBtn');
  const resultSection = $('#resultSection');
  const predictionSection = $('#predictionSection');
  const errorSection = $('#errorSection');
  const errorText = $('#errorText');
  const statsBody = $('#statsBody');
  const playerMeta = $('#playerMeta');
  const predictionCard = $('#predictionCard');

  // 서버에서 선수 검색
  async function searchPlayers(query) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/search?query=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('선수 검색에 실패했습니다.');
      return await response.json();
    } catch (error) {
      console.error('Error searching players:', error);
      showError('선수 검색 중 오류가 발생했습니다.');
      return [];
    }
  }

  // 서버에서 선수 상세 정보 및 기록 조회
  async function fetchPlayerData(playerId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/player/${playerId}?season=${SEASON}`);
      if (!response.ok) throw new Error('선수 정보를 불러오지 못했습니다.');
      return await response.json();
    } catch (error) {
      console.error('Error fetching player data:', error);
      showError('선수 정보를 불러오는 중 오류가 발생했습니다.');
      return null;
    }
  }

  async function findPlayer(query) {
    if (!query) return null;
    const trimmed = String(query).trim();
    if (!trimmed) return null;

    // 서버에서 선수 검색
    const players = await searchPlayers(trimmed);
    if (!players || players.length === 0) return null;
    
    // 정확히 숫자면 ID로 검색
    if (/^\d+$/.test(trimmed)) {
      return players.find(p => String(p.id) === trimmed) || players[0];
    }
    
    // 이름으로 검색 (정확한 일치가 없으면 첫 번째 결과 반환)
    const exactMatch = players.find(p => p.name === trimmed);
    return exactMatch || players[0];
  }

  function formatNumber(n) {
    return new Intl.NumberFormat('ko-KR').format(n);
  }

  function calcAVG(H, AB) {
    if (!AB || AB === 0) return 0;
    return H / AB;
  }

  function toFixed3(x) {
    return (Math.round(x * 1000) / 1000).toFixed(3);
  }

  function renderPlayerMeta(player) {
    playerMeta.textContent = `${player.name} · ${player.team || '팀정보없음'} · ${player.league || 'KBO'}`;
  }

  function renderStatsTable(row) {
    statsBody.innerHTML = '';
    const tr = document.createElement('tr');
    const cells = [
      row.season,
      formatNumber(row.PA),
      formatNumber(row.AB),
      formatNumber(row.H),
      formatNumber(row['2B']),
      formatNumber(row['3B']),
      formatNumber(row.HR),
      formatNumber(row.BB),
      formatNumber(row.SO),
      toFixed3(calcAVG(row.H, row.AB))
    ];
    cells.forEach((c, idx) => {
      const td = document.createElement('td');
      td.textContent = c;
      tr.appendChild(td);
    });
    statsBody.appendChild(tr);
  }

  function renderPrediction(row) {
    const avg = calcAVG(row.H, row.AB);
    predictionCard.innerHTML = `
      <div class="title">베이스라인 예측(현재 AVG 기준)</div>
      <div class="value">${toFixed3(avg)}</div>
      <div class="desc">현 시점의 누적 성적을 바탕으로 시즌 종료 시점의 최종 AVG를 현재 AVG로 가정합니다.</div>
    `;
  }

  function showSections(hasResult) {
    resultSection.hidden = !hasResult;
    predictionSection.hidden = !hasResult;
  }

  function showError(msg) {
    errorText.textContent = msg;
    errorSection.hidden = false;
    showSections(false);
  }

  function clearError() {
    errorText.textContent = '';
    errorSection.hidden = true;
  }

  async function onSearch() {
    clearError();
    const q = playerInput.value;
    
    // 로딩 상태 표시
    searchBtn.disabled = true;
    searchBtn.textContent = '검색 중...';
    
    try {
      const player = await findPlayer(q);
      if (!player) {
        showError('해당 선수(ID/정확한 이름)를 찾을 수 없습니다.');
        return;
      }
      
      // 선수 상세 정보 및 기록 조회
      const playerData = await fetchPlayerData(player.id);
      if (!playerData || !playerData.stats) {
        showError('선수 기록을 불러올 수 없습니다.');
        return;
      }
      
      renderPlayerMeta(playerData.player);
      renderStatsTable(playerData.stats);
      renderPrediction(playerData.stats);
      showSections(true);
    } catch (error) {
      console.error('Search error:', error);
      showError('검색 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
    } finally {
      // 로딩 상태 해제
      searchBtn.disabled = false;
      searchBtn.textContent = '확인';
    }
  }

  // 이벤트 리스너 등록
  searchBtn.addEventListener('click', onSearch);
  playerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') onSearch();
  });
  
  // 페이지 로드 시 입력창에 포커스
  window.addEventListener('load', () => {
    playerInput.focus();
  });
})();
