/**
 * NewsBoard Federated Data Bridge (브라우저 연합 데이터 메시 클라이언트)
 * - 렛츠로 (https://pyw31337.github.io/law/ 또는 ../law/)
 * - 렛츠인슈 (https://pyw31337.github.io/insu/ 또는 ../insu/)
 * - 렛츠에셋 (https://pyw31337.github.io/asset/ 또는 ../asset/)
 * - 렛츠피플 (가칭, 인물 온톨로지 연동 규격)
 */

window.FederationBridge = {
  endpoints: {
    law: {
      remote: 'https://pyw31337.github.io/law/data/precedents_db.json',
      local: '../law/data/precedents_db.json'
    },
    insu: {
      remote: 'https://pyw31337.github.io/insu/data/policy_terms_db.json',
      local: '../insu/data/policy_terms_db.json'
    },
    asset: {
      remote: 'https://pyw31337.github.io/asset/data/all_dimensions_dossier.json',
      local: '../asset/data/all_dimensions_dossier.json'
    }
  },

  async fetchLedger(service) {
    const cfg = this.endpoints[service];
    if (!cfg) throw new Error(`Unknown federated service: ${service}`);
    
    // 로컬 우선 시도, 실패 시 원격 배포 엔드포인트 폴백
    try {
      const res = await fetch(cfg.local, { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch (e) { /* fallback to remote */ }

    try {
      const res = await fetch(cfg.remote, { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn(`[FederationBridge] Failed to load ${service} data`, e);
      return null;
    }
  },

  async getPrecedent(caseNo) {
    const data = await this.fetchLedger('law');
    if (!data) return null;
    return data.precedents?.find(p => p.case_no === caseNo) || null;
  },

  async getPolicy(categoryKeyword) {
    const data = await this.fetchLedger('insu');
    if (!data) return null;
    return data.policies?.find(p => (p.category || '').includes(categoryKeyword)) || null;
  },

  async getCorp(stockCode) {
    const data = await this.fetchLedger('asset');
    if (!data) return null;
    return data.companies?.[stockCode] || null;
  }
};
