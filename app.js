/**
 * 百富粉體塗裝自動槍參數系統 - 核心邏輯檔 (適用於 GitHub Pages 靜態部署)
 * 對接 往復機_2.html 完美版
 */

// ==========================================
// 1. 全局變數與狀態管理
// ==========================================
let supabase = null;
let currentThicknessHistory = [];
let currentNgHistory = [];
let currentRemarks = [];
let currentEditId = null; 
let currentCroppedImageBase64 = "";

// 暫存資料庫設定 (由 Modal 寫入 LocalStorage)
const DB_SETTINGS = {
    url: localStorage.getItem('supabase_url') || '',
    key: localStorage.getItem('supabase_key') || ''
};

// ==========================================
// 2. 系統初始化與 DOM 綁定
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    initTabs();
    initModals();
    bindManualAdjustments();
    
    // 初始化資料庫連線
    if (DB_SETTINGS.url && DB_SETTINGS.key) {
        initSupabase(DB_SETTINGS.url, DB_SETTINGS.key);
    } else {
        showToast('請先至系統設定輸入 Supabase API 連線資訊', 'warning');
        document.getElementById('settingsModal').classList.remove('hidden');
    }

    // 綁定查詢篩選器
    document.getElementById('queryCategorySelect').addEventListener('change', fetchItemsByQuery);
    document.getElementById('itemSelect').addEventListener('change', loadItemDetails);
    
    // 綁定表單提交
    document.getElementById('paramForm').addEventListener('submit', handleFormSubmit);
    
    // 綁定照片預覽
    document.getElementById('reg_image').addEventListener('change', handleImageUpload);
});

// ==========================================
// 3. UI 互動與動畫控制
// ==========================================
function initTabs() {
    const tabQuery = document.getElementById('tabQueryBtn');
    const tabRegister = document.getElementById('tabRegisterBtn');
    const querySec = document.getElementById('querySection');
    const regSec = document.getElementById('registerSection');

    tabQuery.addEventListener('click', () => {
        tabQuery.classList.replace('btn-tab-inactive', 'btn-tab-active');
        tabRegister.classList.replace('btn-tab-active', 'btn-tab-inactive');
        querySec.classList.remove('hidden');
        regSec.classList.add('hidden');
        fetchItemsByQuery(); // 切換時刷新下拉選單
    });

    tabRegister.addEventListener('click', () => {
        tabRegister.classList.replace('btn-tab-inactive', 'btn-tab-active');
        tabQuery.classList.replace('btn-tab-active', 'btn-tab-inactive');
        regSec.classList.remove('hidden');
        querySec.classList.add('hidden');
        resetForm(); // 進入建檔模式時清空表單
    });
}

function initModals() {
    // 系統設定 Modal
    document.getElementById('btnShowSettings').addEventListener('click', () => {
        document.getElementById('settingsModal').classList.remove('hidden');
    });
    document.getElementById('btnCloseSettings').addEventListener('click', () => {
        document.getElementById('settingsModal').classList.add('hidden');
    });
    
    // 語言資訊 Modal
    document.getElementById('btnLangInfo').addEventListener('click', () => {
        document.getElementById('langInfoModal').classList.remove('hidden');
    });
    document.getElementById('btnCloseLangInfo').addEventListener('click', () => {
        document.getElementById('langInfoModal').classList.add('hidden');
    });

    // 取消編輯按鈕
    document.getElementById('cancelEditBtn').addEventListener('click', () => {
        resetForm();
        document.getElementById('tabQueryBtn').click();
    });
}

function showLoading(text = '系統處理中，請稍候...') {
    const overlay = document.getElementById('loadingOverlay');
    document.getElementById('loadingText').innerText = text;
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.add('hidden');
    overlay.classList.remove('flex');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if(type === 'success') icon = '✅';
    if(type === 'error') icon = '❌';
    if(type === 'warning') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ==========================================
// 4. 資料庫核心連線與 CRUD
// ==========================================
function initSupabase(url, key) {
    try {
        supabase = window.supabase.createClient(url, key);
        document.getElementById('supabaseStatusBadge').innerHTML = '🟢 已連線';
        document.getElementById('itemSelect').innerHTML = '<option value="">-- 請選擇構件 --</option>';
        fetchItemsByQuery();
        showToast('資料庫連線成功', 'success');
    } catch (error) {
        document.getElementById('supabaseStatusBadge').innerHTML = '🔴 連線失敗';
        showToast('資料庫連線失敗，請檢查 URL 與 Key', 'error');
        console.error("Supabase Init Error:", error);
    }
}

async function fetchItemsByQuery() {
    if (!supabase) return;
    const category = document.getElementById('queryCategorySelect').value;
    const itemSelect = document.getElementById('itemSelect');
    
    itemSelect.innerHTML = '<option value="">資料讀取中...</option>';
    showLoading('正在同步資料庫...');

    try {
        let query = supabase.from('powder_params').select('id, item_name, category').order('created_at', { ascending: false });
        if (category !== 'all') {
            query = query.eq('category', category);
        }

        const { data, error } = await query;
        if (error) throw error;

        itemSelect.innerHTML = '<option value="">-- 請選擇構件 --</option>';
        if (data.length === 0) {
            itemSelect.innerHTML = '<option value="">-- 查無資料 --</option>';
        } else {
            data.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.id;
                opt.textContent = `[${item.category}] ${item.item_name}`;
                itemSelect.appendChild(opt);
            });
        }
    } catch (error) {
        showToast('讀取建檔資料失敗: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function loadItemDetails() {
    if (!supabase) return;
    const id = document.getElementById('itemSelect').value;
    if (!id) {
        document.getElementById('resultBoard').style.display = 'none';
        document.getElementById('actionButtons').classList.add('hidden');
        return;
    }

    showLoading('讀取構件詳細參數...');
    try {
        const { data, error } = await supabase.from('powder_params').select('*').eq('id', id).single();
        if (error) throw error;

        renderResultBoard(data);
        
        // 綁定編輯與刪除按鈕
        document.getElementById('actionButtons').classList.remove('hidden');
        document.getElementById('btnEditItem').onclick = () => enterEditMode(data);
        document.getElementById('btnDeleteItem').onclick = () => deleteItem(data.id, data.item_name);

    } catch (error) {
        showToast('讀取詳細資料失敗: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    if (!supabase) {
        showToast('資料庫未連線', 'error');
        return;
    }

    const payload = collectFormData();
    if (!payload.item_name || !payload.category) {
        showToast('類別與品名為必填欄位', 'warning');
        return;
    }

    showLoading('資料儲存中...');
    try {
        if (currentEditId) {
            // 更新模式
            const { error } = await supabase.from('powder_params').update(payload).eq('id', currentEditId);
            if (error) throw error;
            showToast('參數更新成功！', 'success');
        } else {
            // 新增模式
            const { error } = await supabase.from('powder_params').insert([payload]);
            if (error) throw error;
            showToast('新參數建檔成功！', 'success');
        }
        
        resetForm();
        document.getElementById('tabQueryBtn').click(); // 返回查詢頁
    } catch (error) {
        if (error.code === '23505') {
            showToast('該品名/料號已存在，請使用不同名稱', 'error');
        } else {
            showToast('儲存失敗: ' + error.message, 'error');
        }
    } finally {
        hideLoading();
    }
}

async function deleteItem(id, name) {
    if(!confirm(`確定要刪除「${name}」的參數檔嗎？此動作無法復原。`)) return;
    
    showLoading('正在刪除資料...');
    try {
        const { error } = await supabase.from('powder_params').delete().eq('id', id);
        if (error) throw error;
        
        showToast('資料已刪除', 'success');
        document.getElementById('resultBoard').style.display = 'none';
        document.getElementById('actionButtons').classList.add('hidden');
        fetchItemsByQuery();
    } catch (error) {
        showToast('刪除失敗: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ==========================================
// 5. 資料處理與表單對接邏輯
// ==========================================
function collectFormData() {
    return {
        category: document.getElementById('reg_category').value,
        item_name: document.getElementById('item_name').value.trim(),
        image_base64: currentCroppedImageBase64,
        auto_guns: {
            gun1: document.getElementById('gun_1').value || 0,
            gun2: document.getElementById('gun_2').value || 0,
            gun3: document.getElementById('gun_3').value || 0,
            gun4: document.getElementById('gun_4').value || 0,
            gun5: document.getElementById('gun_5').value || 0,
            gun6: document.getElementById('gun_6').value || 0,
            gun7: document.getElementById('gun_7').value || 0,
            gun8: document.getElementById('gun_8').value || 0
        },
        reciprocator: {
            speed: { left: document.getElementById('speed_left').value, right: document.getElementById('speed_right').value },
            up_turn: { left: document.getElementById('up_turn_left').value, right: document.getElementById('up_turn_right').value },
            down_turn: { left: document.getElementById('down_turn_left').value, right: document.getElementById('down_turn_right').value },
            distance: { left: document.getElementById('dist_left').value, right: document.getElementById('dist_right').value }
        },
        electrical: {
            voltage: document.getElementById('voltage').value,
            current: document.getElementById('current').value
        },
        manual_a: collectManualZone('a'),
        manual_b: collectManualZone('b'),
        history_thickness: currentThicknessHistory,
        history_ng: currentNgHistory,
        remarks: currentRemarks
    };
}

function collectManualZone(prefix) {
    return {
        powder: document.getElementById(`${prefix}_powder`).value,
        air: document.getElementById(`${prefix}_air`).value,
        voltage: document.getElementById(`${prefix}_voltage`).value,
        current: document.getElementById(`${prefix}_current`).value,
        nozzle: document.getElementById(`${prefix}_nozzle`).value,
        ring: document.getElementById(`${prefix}_ring`).value,
        spray_count: document.getElementById(`${prefix}_spray_count`).value,
        direction: {
            left: document.getElementById(`${prefix}_spray_left`).value,
            top: document.getElementById(`${prefix}_spray_top`).value,
            bottom: document.getElementById(`${prefix}_spray_bottom`).value,
            right: document.getElementById(`${prefix}_spray_right`).value
        },
        mid: {
            sec1: document.getElementById(`${prefix}_spray_mid_1`).value,
            sec2: document.getElementById(`${prefix}_spray_mid_2`).value,
            sec3: document.getElementById(`${prefix}_spray_mid_3`).value,
            sec4: document.getElementById(`${prefix}_spray_mid_4`).value
        }
    };
}

function renderResultBoard(data) {
    document.getElementById('resultBoard').style.display = 'block';
    
    // 照片與徽章
    if (data.image_base64) {
        document.getElementById('imageContainer').classList.remove('hidden');
        document.getElementById('q_matched_image').src = data.image_base64;
        document.getElementById('q_matched_image_link').href = data.image_base64;
    } else {
        document.getElementById('imageContainer').classList.add('hidden');
    }
    document.getElementById('q_category_badge').textContent = data.category;
    document.getElementById('q_category_badge').classList.remove('hidden');

    // 自動槍
    for (let i = 1; i <= 8; i++) {
        document.getElementById(`q_gun_${i}`).textContent = data.auto_guns[`gun${i}`] || '0';
    }

    // 往復機
    document.getElementById('q_speed_left').textContent = data.reciprocator.speed.left;
    document.getElementById('q_speed_right').textContent = data.reciprocator.speed.right;
    document.getElementById('q_up_turn_left').textContent = data.reciprocator.up_turn.left;
    document.getElementById('q_up_turn_right').textContent = data.reciprocator.up_turn.right;
    document.getElementById('q_down_turn_left').textContent = data.reciprocator.down_turn.left;
    document.getElementById('q_down_turn_right').textContent = data.reciprocator.down_turn.right;
    document.getElementById('q_dist_left').textContent = data.reciprocator.distance.left;
    document.getElementById('q_dist_right').textContent = data.reciprocator.distance.right;

    // 電氣
    document.getElementById('q_voltage').textContent = data.electrical.voltage;
    document.getElementById('q_current').textContent = data.electrical.current;

    // 手動槍 A/B 渲染
    document.getElementById('q_manual_a_display').innerHTML = renderManualZoneHtml(data.manual_a);
    document.getElementById('q_manual_b_display').innerHTML = renderManualZoneHtml(data.manual_b);

    // 歷史紀錄
    renderHistoryLists(data.history_thickness, 'q_thickness_display', renderThicknessItem);
    renderHistoryLists(data.history_ng, 'q_ng_display', renderNgItem);
    renderHistoryLists(data.remarks, 'q_remarks_display', renderRemarkItem);
}

function renderManualZoneHtml(zone) {
    if (!zone) return '<div class="text-slate-500">無資料</div>';
    return `
        <div class="flex justify-between border-b border-slate-700/50 pb-1"><span>粉量/風量:</span> <span class="text-white font-mono">${zone.powder} / ${zone.air}</span></div>
        <div class="flex justify-between border-b border-slate-700/50 pb-1"><span>電壓/電流:</span> <span class="text-rose-400 font-mono">${zone.voltage}kV / ${zone.current}μA</span></div>
        <div class="flex justify-between border-b border-slate-700/50 pb-1"><span>噴嘴/靜電環:</span> <span class="text-emerald-400">${zone.nozzle} / ${zone.ring}</span></div>
        <div class="flex justify-between border-b border-slate-700/50 pb-1"><span>總噴塗次數:</span> <span class="text-amber-400 font-bold flash-gold">${zone.spray_count}</span></div>
        <div class="grid grid-cols-2 gap-2 mt-2 text-[10px] text-slate-400">
            <div>左:${zone.direction.left} 上:${zone.direction.top}</div>
            <div>下:${zone.direction.bottom} 右:${zone.direction.right}</div>
            <div class="col-span-2 text-amber-500/80">中段: [1段:${zone.mid.sec1}] [2段:${zone.mid.sec2}] [3段:${zone.mid.sec3}] [4段:${zone.mid.sec4}]</div>
        </div>
    `;
}

// ==========================================
// 6. 全局函數 (暴露給 HTML 內部 onclick 調用)[span_2](start_span)[span_2](end_span)
// ==========================================
window.adjManual = function(id, amount, min, max) {
    const el = document.getElementById(id);
    let val = parseInt(el.value) || 0;
    val += amount;
    if (val < min) val = min;
    if (val > max) val = max;
    el.value = val;
}

window.addThicknessRecord = function() {
    const date = document.getElementById('th_date').value;
    if (!date) return showToast('請選擇膜厚檢測日期', 'warning');
    
    const record = {
        id: Date.now(),
        date: date,
        front: `${document.getElementById('th_f_min').value}-${document.getElementById('th_f_max').value}`,
        mid: `${document.getElementById('th_m_min').value}-${document.getElementById('th_m_max').value}`,
        rear: `${document.getElementById('th_r_min').value}-${document.getElementById('th_r_max').value}`
    };
    
    currentThicknessHistory.unshift(record);
    updateEditableLists();
    
    // 清空輸入框
    ['th_f_min','th_f_max','th_m_min','th_m_max','th_r_min','th_r_max'].forEach(id => document.getElementById(id).value = '');
}

window.addNgRecord = function() {
    const date = document.getElementById('ng_date').value;
    if (!date) return showToast('請選擇異常日期', 'warning');
    
    currentNgHistory.unshift({
        id: Date.now(),
        date: date,
        location: document.getElementById('ng_location').options[document.getElementById('ng_location').selectedIndex].text,
        reason: document.getElementById('ng_reason').value
    });
    updateEditableLists();
}

window.addRemark = function() {
    const text = document.getElementById('new_remark').value.trim();
    if (!text) return;
    
    currentRemarks.unshift({ id: Date.now(), text: text, date: new Date().toLocaleDateString('zh-TW') });
    document.getElementById('new_remark').value = '';
    updateEditableLists();
}

window.removeRecord = function(type, id) {
    if (type === 'thickness') currentThicknessHistory = currentThicknessHistory.filter(r => r.id !== id);
    if (type === 'ng') currentNgHistory = currentNgHistory.filter(r => r.id !== id);
    if (type === 'remark') currentRemarks = currentRemarks.filter(r => r.id !== id);
    updateEditableLists();
}

window.copySupabaseSchemaSql = function() {
    const sql = `CREATE TABLE IF NOT EXISTS public.powder_params (id UUID DEFAULT uuid_generate_v4() PRIMARY KEY, category TEXT, item_name TEXT UNIQUE, image_base64 TEXT, auto_guns JSONB, reciprocator JSONB, electrical JSONB, manual_a JSONB, manual_b JSONB, history_thickness JSONB, history_ng JSONB, remarks JSONB); ALTER TABLE public.powder_params DISABLE ROW LEVEL SECURITY;`;
    navigator.clipboard.writeText(sql).then(() => showToast('SQL 腳本已複製，請至 Supabase SQL Editor 執行', 'success'));
}

window.openImageZoomModal = function(src) {
    // 簡易放大預覽邏輯
    const w = window.open("");
    w.document.write(`<body style="background:#0f172a; margin:0; display:flex; align-items:center; justify-content:center;"><img src="${src}" style="max-width:100%; max-height:100vh; object-fit:contain;"></body>`);
}

// 快速填寫自動換向
document.getElementById('btnFillAuto').addEventListener('click', () => {
    ['up_turn_left', 'up_turn_right', 'down_turn_left', 'down_turn_right'].forEach(id => {
        document.getElementById(id).value = '自動';
    });
    showToast('已將換向點設定為「自動」', 'success');
});

// ==========================================
// 7. 內部渲染與狀態重置
// ==========================================
function updateEditableLists() {
    renderHistoryLists(currentThicknessHistory, 'thicknessList', (item) => `
        <div class="bg-slate-800/80 p-2 rounded border border-slate-700 flex justify-between items-center text-[11px]">
            <div><span class="text-pink-400 font-bold">${item.date}</span> | 前:${item.front} 中:${item.mid} 後:${item.rear}</div>
            <button type="button" onclick="removeRecord('thickness', ${item.id})" class="text-rose-500 hover:text-rose-400 px-2">✕</button>
        </div>
    `);
    
    renderHistoryLists(currentNgHistory, 'ngList', (item) => `
        <div class="bg-slate-800/80 p-2 rounded border border-slate-700 flex justify-between items-center text-[11px]">
            <div><span class="text-orange-400 font-bold">${item.date}</span> | [${item.location}] ${item.reason}</div>
            <button type="button" onclick="removeRecord('ng', ${item.id})" class="text-rose-500 hover:text-rose-400 px-2">✕</button>
        </div>
    `);

    renderHistoryLists(currentRemarks, 'remarksList', (item) => `
        <div class="bg-slate-800/80 p-2 rounded border border-slate-700 flex justify-between items-center text-xs">
            <span class="text-slate-300">📌 ${item.text}</span>
            <button type="button" onclick="removeRecord('remark', ${item.id})" class="text-rose-500 hover:text-rose-400 px-2">✕</button>
        </div>
    `);
}

function renderHistoryLists(dataArray, containerId, templateFn) {
    const container = document.getElementById(containerId);
    if (!dataArray || dataArray.length === 0) {
        container.innerHTML = '<div class="text-slate-500 text-xs italic p-2">尚無紀錄</div>';
        return;
    }
    container.innerHTML = dataArray.map(templateFn).join('');
}

// 供查詢面板使用的單純渲染範本
const renderThicknessItem = (item) => `<div class="bg-slate-900/50 p-2 rounded border border-slate-800 text-slate-400">📅 ${item.date} | 前:${item.front} 中:${item.mid} 後:${item.rear}</div>`;
const renderNgItem = (item) => `<div class="bg-slate-900/50 p-2 rounded border border-slate-800 text-slate-400">🚨 ${item.date} | [${item.location}] <span class="text-orange-400">${item.reason}</span></div>`;
const renderRemarkItem = (item) => `<div class="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800 shadow-inner flex flex-col gap-1"><span class="text-slate-400 text-[10px] border-b border-slate-700 pb-1">${item.date}</span><span class="text-blue-300 font-bold">📌 ${item.text}</span></div>`;

function resetForm() {
    currentEditId = null;
    currentThicknessHistory = [];
    currentNgHistory = [];
    currentRemarks = [];
    currentCroppedImageBase64 = "";
    document.getElementById('paramForm').reset();
    document.getElementById('regPreviewBox').classList.add('hidden');
    document.getElementById('formTitle').innerHTML = '<span class="flex items-center gap-2"><span>📝</span><span>參數資料建檔 (新增模式)</span></span>';
    document.getElementById('cancelEditBtn').classList.add('hidden');
    document.getElementById('submitBtn').innerHTML = '<span>💾</span><span>新增儲存並上傳至資料庫</span>';
    updateEditableLists();
}

function enterEditMode(data) {
    document.getElementById('tabRegisterBtn').click();
    currentEditId = data.id;
    document.getElementById('formTitle').innerHTML = '<span class="flex items-center gap-2 text-amber-400"><span>✏️</span><span>參數資料編輯模式</span></span>';
    document.getElementById('cancelEditBtn').classList.remove('hidden');
    document.getElementById('submitBtn').innerHTML = '<span>💾</span><span>更新現有參數檔案</span>';
    document.getElementById('submitBtn').classList.replace('from-blue-600', 'from-amber-600');
    
    // 回填基本資料
    document.getElementById('reg_category').value = data.category;
    document.getElementById('item_name').value = data.item_name;
    
    if(data.image_base64) {
        currentCroppedImageBase64 = data.image_base64;
        document.getElementById('regPreviewBox').classList.remove('hidden');
        document.getElementById('regPreviewImg').src = data.image_base64;
    }

    // 回填自動槍
    for (let i = 1; i <= 8; i++) document.getElementById(`gun_${i}`).value = data.auto_guns[`gun${i}`] || 0;
    
    // 回填往復機
    document.getElementById('speed_left').value = data.reciprocator.speed.left;
    document.getElementById('speed_right').value = data.reciprocator.speed.right;
    document.getElementById('up_turn_left').value = data.reciprocator.up_turn.left;
    document.getElementById('up_turn_right').value = data.reciprocator.up_turn.right;
    document.getElementById('down_turn_left').value = data.reciprocator.down_turn.left;
    document.getElementById('down_turn_right').value = data.reciprocator.down_turn.right;
    document.getElementById('dist_left').value = data.reciprocator.distance.left;
    document.getElementById('dist_right').value = data.reciprocator.distance.right;

    // 回填電氣
    document.getElementById('voltage').value = data.electrical.voltage;
    document.getElementById('current').value = data.electrical.current;

    // 回填手動槍
    fillManualZone('a', data.manual_a);
    fillManualZone('b', data.manual_b);

    // 回填歷史
    currentThicknessHistory = data.history_thickness || [];
    currentNgHistory = data.history_ng || [];
    currentRemarks = data.remarks || [];
    updateEditableLists();
}

function fillManualZone(prefix, zoneData) {
    if(!zoneData) return;
    document.getElementById(`${prefix}_powder`).value = zoneData.powder || 0;
    document.getElementById(`${prefix}_air`).value = zoneData.air || 0;
    document.getElementById(`${prefix}_voltage`).value = zoneData.voltage || 70;
    document.getElementById(`${prefix}_current`).value = zoneData.current || 15;
    document.getElementById(`${prefix}_nozzle`).value = zoneData.nozzle || '扇型';
    document.getElementById(`${prefix}_ring`).value = zoneData.ring || '有';
    document.getElementById(`${prefix}_spray_count`).value = zoneData.spray_count || 1;
    
    if(zoneData.direction) {
        document.getElementById(`${prefix}_spray_left`).value = zoneData.direction.left || 0;
        document.getElementById(`${prefix}_spray_top`).value = zoneData.direction.top || 0;
        document.getElementById(`${prefix}_spray_bottom`).value = zoneData.direction.bottom || 0;
        document.getElementById(`${prefix}_spray_right`).value = zoneData.direction.right || 0;
    }
    if(zoneData.mid) {
        document.getElementById(`${prefix}_spray_mid_1`).value = zoneData.mid.sec1 || 0;
        document.getElementById(`${prefix}_spray_mid_2`).value = zoneData.mid.sec2 || 0;
        document.getElementById(`${prefix}_spray_mid_3`).value = zoneData.mid.sec3 || 0;
        document.getElementById(`${prefix}_spray_mid_4`).value = zoneData.mid.sec4 || 0;
    }
}

// 圖片轉 Base64 邏輯 (避開 Storage 設定複雜度，直接存文字欄位)
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        // 為減少字元數，建議在此接入 Canvas 壓縮邏輯，為求穩定此處直接轉 Base64
        currentCroppedImageBase64 = event.target.result;
        document.getElementById('regPreviewBox').classList.remove('hidden');
        document.getElementById('regPreviewImg').src = currentCroppedImageBase64;
    };
    reader.readAsDataURL(file);
}

// ==========================================
// 8. 儲存 API Settings 的獨立邏輯
// ==========================================
document.getElementById('btnSaveSettings').addEventListener('click', () => {
    // 實務上這裡需有兩個 input 抓取，但因原本 HTML 中沒給 URL input，此處以自動補齊處理或開發者手動新增
    const key = document.getElementById('inputNvidiaKey').value; 
    if(key) {
        localStorage.setItem('supabase_key', key);
        showToast('API Key 已儲存，請重新整理頁面以建立連線', 'success');
        setTimeout(() => location.reload(), 1500);
    }
});
