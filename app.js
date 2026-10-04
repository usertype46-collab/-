// --- 1. Supabase & 系統 API 設定 ---
const supabaseUrl = 'https://wxdrtnqizpbjfugdaglb.supabase.co';
const supabaseKey = 'sb_publishable_qUCcWVbzo-99rP85r_RhQg_EGewmxB4';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const defaultNvidiaKey = "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";
const defaultGasUrl = "https://script.google.com/macros/s/AKfycbwLoLqBnLm3-rwYBFJUd88j5ug-IW4SVdmg1AMr-1lZGzMYQ2iASoShRsi6CJZGxddp/exec";
const defaultAiModel = "Respan Span 01 Lite";

const TABLE_NAME = 'items'; // Supabase 表單名稱

// --- 狀態變數 ---
let allItems = [];
let currentItem = null;
let currentThicknessRecords = [];
let currentNgRecords = [];
let currentRemarks = [];
let uploadedImageUrl = "";

let sysSettings = {
    nvidiaKey: localStorage.getItem('nvidiaKey') || defaultNvidiaKey,
    gasUrl: localStorage.getItem('gasUrl') || defaultGasUrl,
    aiModel: localStorage.getItem('aiModel') || defaultAiModel
};

// --- 初始化程序 ---
document.addEventListener('DOMContentLoaded', async () => {
    initUI();
    bindEvents();
    await checkDbConnection(); // 啟動時立刻連線取得現有庫存
});

function initUI() {
    document.getElementById('inputNvidiaKey').value = sysSettings.nvidiaKey;
    document.getElementById('inputGasUrl').value = sysSettings.gasUrl;
    document.getElementById('selectAiModel').value = sysSettings.aiModel;
    document.getElementById('currentAiBadge').textContent = `AI 模型: ${sysSettings.aiModel}`;
}

function bindEvents() {
    // 頁籤切換
    document.getElementById('tabQueryBtn').addEventListener('click', () => switchTab('query'));
    document.getElementById('tabRegisterBtn').addEventListener('click', () => switchTab('register'));

    // Settings Modal
    document.getElementById('btnShowSettings').addEventListener('click', () => {
        document.getElementById('settingsModal').classList.remove('hidden');
    });
    document.getElementById('btnCloseSettings').addEventListener('click', () => {
        document.getElementById('settingsModal').classList.add('hidden');
    });
    document.getElementById('btnSaveSettings').addEventListener('click', saveSettings);

    // Thickness Summary Modal
    document.getElementById('btnOpenThicknessModal').addEventListener('click', openThicknessSummary);
    document.getElementById('btnCloseThicknessTable').addEventListener('click', () => {
        document.getElementById('thicknessTableModal').classList.add('hidden');
    });

    // 類別過濾與選擇器
    document.getElementById('categoryFilter').addEventListener('change', renderItemOptions);
    document.getElementById('itemSelect').addEventListener('change', handleItemSelect);

    // 表單功能
    document.getElementById('paramForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('cancelEditBtn').addEventListener('click', resetForm);
    document.getElementById('btnFillAuto').addEventListener('click', fillAutoRecip);
    document.getElementById('reg_image').addEventListener('change', handleImageUpload);
    
    // 構件管理
    document.getElementById('btnEditItem').addEventListener('click', enterEditMode);
    document.getElementById('btnDeleteItem').addEventListener('click', deleteCurrentItem);
}

function switchTab(tab) {
    const qSec = document.getElementById('querySection');
    const rSec = document.getElementById('registerSection');
    const qBtn = document.getElementById('tabQueryBtn');
    const rBtn = document.getElementById('tabRegisterBtn');

    if (tab === 'query') {
        qSec.classList.remove('hidden');
        rSec.classList.add('hidden');
        qBtn.className = "flex-1 bg-gradient-to-r from-blue-700 to-blue-900 border border-blue-500/50 py-2.5 sm:py-3 px-2 rounded-xl font-bold text-xs sm:text-base shadow-lg shadow-blue-900/20 transition-all hover:brightness-110 text-white";
        rBtn.className = "flex-1 bg-slate-800 border border-slate-600 py-2.5 sm:py-3 px-2 rounded-xl font-bold text-xs sm:text-base text-slate-300 transition-all hover:bg-slate-700 hover:text-white";
    } else {
        qSec.classList.add('hidden');
        rSec.classList.remove('hidden');
        rBtn.className = "flex-1 bg-gradient-to-r from-blue-700 to-blue-900 border border-blue-500/50 py-2.5 sm:py-3 px-2 rounded-xl font-bold text-xs sm:text-base shadow-lg shadow-blue-900/20 transition-all hover:brightness-110 text-white";
        qBtn.className = "flex-1 bg-slate-800 border border-slate-600 py-2.5 sm:py-3 px-2 rounded-xl font-bold text-xs sm:text-base text-slate-300 transition-all hover:bg-slate-700 hover:text-white";
        if(!currentItem) resetForm(); 
    }
}

function saveSettings() {
    sysSettings.nvidiaKey = document.getElementById('inputNvidiaKey').value;
    sysSettings.gasUrl = document.getElementById('inputGasUrl').value;
    sysSettings.aiModel = document.getElementById('selectAiModel').value;
    
    localStorage.setItem('nvidiaKey', sysSettings.nvidiaKey);
    localStorage.setItem('gasUrl', sysSettings.gasUrl);
    localStorage.setItem('aiModel', sysSettings.aiModel);
    
    document.getElementById('currentAiBadge').textContent = `AI 模型: ${sysSettings.aiModel}`;
    document.getElementById('settingsModal').classList.add('hidden');
    alert("系統設定已成功儲存！");
}

// --- 2. Supabase 資料庫處理邏輯 ---
async function checkDbConnection() {
    const select = document.getElementById('itemSelect');
    select.innerHTML = '<option value="">-- 資料庫連線中... --</option>';
    try {
        const { data, error } = await supabase.from(TABLE_NAME).select('*').order('created_at', { ascending: false });
        if (error) throw error;
        allItems = data || [];
        renderItemOptions();
    } catch (err) {
        console.error("DB Error:", err);
        select.innerHTML = '<option value="">-- ⚠️ 資料庫連線異常 --</option>';
    }
}

function renderItemOptions() {
    const filterCat = document.getElementById('categoryFilter').value;
    const select = document.getElementById('itemSelect');
    
    select.innerHTML = '<option value="">-- 請選擇已建檔之構件 --</option>';
    const filtered = filterCat ? allItems.filter(item => item.category === filterCat) : allItems;
    
    filtered.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = `${item.item_name} ${item.category ? `(${item.category})` : ''}`;
        select.appendChild(opt);
    });
}

function handleItemSelect(e) {
    const id = e.target.value;
    if (!id) {
        document.getElementById('resultBoard').style.display = 'none';
        document.getElementById('actionButtons').classList.add('hidden');
        return;
    }
    
    currentItem = allItems.find(i => i.id == id);
    if (currentItem) displayResult(currentItem);
}

function displayResult(item) {
    document.getElementById('resultBoard').style.display = 'block';
    document.getElementById('actionButtons').classList.remove('hidden');
    
    const imgBox = document.getElementById('imageContainer');
    const imgEl = document.getElementById('q_matched_image');
    const imgLink = document.getElementById('q_matched_image_link');
    
    if (item.image_url) {
        imgBox.classList.remove('hidden');
        imgEl.src = item.image_url;
        imgEl.onerror = function() { 
            this.onerror = null; // 防止無限迴圈
            this.src = 'https://via.placeholder.com/300x200?text=圖片載入失敗'; 
        };
        imgLink.href = item.image_url;
    } else {
        imgBox.classList.add('hidden');
    }
    
    let d = item.data || {};
    if (typeof d === 'string') {
        try { d = JSON.parse(d); } catch(e){ d = {}; }
    }

    // 自動槍
    for(let i=1; i<=8; i++) {
        document.getElementById(`q_gun_${i}`).textContent = (d.auto_guns && d.auto_guns[`gun_${i}`]) || '-';
    }
    
    // 往復機
    if (d.reciprocator) {
        ['speed_left','speed_right','up_turn_left','up_turn_right','down_turn_left','down_turn_right','dist_left','dist_right'].forEach(k => {
            document.getElementById(`q_${k}`).textContent = d.reciprocator[k] || '-';
        });
    }
    
    // 電氣
    if (d.electrical) {
        document.getElementById('q_voltage').textContent = d.electrical.voltage || '-';
        document.getElementById('q_current').textContent = d.electrical.current || '-';
    }
    
    if (d.manual_a) renderManualSummary('a', d.manual_a);
    if (d.manual_b) renderManualSummary('b', d.manual_b);
    
    renderHistorySummary('q_thickness_display', d.thickness_records, 'thickness');
    renderHistorySummary('q_ng_display', d.ng_records, 'ng');
    renderHistorySummary('q_remarks_display', d.remarks, 'remark');
}

function renderManualSummary(side, data) {
    const el = document.getElementById(`q_manual_${side}_display`);
    if(!el || !data) return;
    
    el.innerHTML = `
        <div class="grid grid-cols-2 gap-2">
            <div>粉量: <b class="text-white">${data.powder||0}</b></div>
            <div>風量: <b class="text-white">${data.air||0}</b></div>
            <div>電壓: <b class="text-white">${data.voltage||0}</b></div>
            <div>電流: <b class="text-white">${data.current||0}</b></div>
            <div>噴嘴: <b class="text-white">${data.nozzle||'-'}</b></div>
            <div>靜電環: <b class="text-white">${data.ring||'-'}</b></div>
            <div class="col-span-2 text-amber-300 font-bold">總次數: <b>${data.spray_count||0}</b></div>
        </div>
    `;
}

function renderHistorySummary(id, records, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    
    if (!records || records.length === 0) {
        el.innerHTML = '<div class="text-slate-500 italic">尚無紀錄</div>';
        return;
    }
    
    records.forEach(r => {
        const div = document.createElement('div');
        div.className = "bg-slate-800/80 p-2 rounded border border-slate-700 mb-1";
        if (type === 'thickness') {
            div.innerHTML = `<b class="text-pink-400">${r.date}</b>: 前[${r.f_min}-${r.f_max}] 中[${r.m_min}-${r.m_max}] 後[${r.r_min}-${r.r_max}]`;
        } else if (type === 'ng') {
            div.innerHTML = `<b class="text-orange-400">${r.date}</b>: <span class="text-white">${r.location} - ${r.reason}</span>`;
        } else if (type === 'remark') {
            div.innerHTML = `<span class="text-white">▪ ${r.text}</span> <span class="text-[10px] text-slate-500 ml-1">(${r.date})</span>`;
        }
        el.appendChild(div);
    });
}

// --- 3. 解決膜厚總覽圖片讀取不到的防護設計 ---
function openThicknessSummary() {
    const tbody = document.getElementById('thicknessTableBody');
    tbody.innerHTML = '';
    
    let allRecords = [];
    allItems.forEach(item => {
        let d = item.data || {};
        if (typeof d === 'string') {
            try { d = JSON.parse(d); } catch(e){ d = {}; }
        }
        let records = d.thickness_records || [];
        
        records.forEach(r => {
            allRecords.push({
                item_name: item.item_name,
                category: item.category || '無分類',
                image_url: item.image_url,
                ...r
            });
        });
    });
    
    // 依據時間倒序排列
    allRecords.sort((a,b) => new Date(b.date) - new Date(a.date));
    
    allRecords.forEach(r => {
        const tr = document.createElement('tr');
        // 加入 referrerpolicy 與 this.onerror=null 防堵無限報錯迴圈
        const imgSrc = r.image_url ? r.image_url : 'https://via.placeholder.com/150?text=No+Image';
        tr.innerHTML = `
            <td class="p-3 border-b border-slate-700">
                <img src="${imgSrc}" referrerpolicy="no-referrer" class="h-12 w-12 object-cover rounded border border-slate-600 bg-slate-800" onerror="this.onerror=null; this.src='https://via.placeholder.com/150?text=Error';">
            </td>
            <td class="p-3 border-b border-slate-700 font-bold text-white">${r.item_name}</td>
            <td class="p-3 border-b border-slate-700 text-blue-300 font-bold">${r.category}</td>
            <td class="p-3 border-b border-slate-700 text-pink-400 font-mono">${r.date}</td>
            <td class="p-3 border-b border-slate-700">${r.f_min} - ${r.f_max}</td>
            <td class="p-3 border-b border-slate-700">${r.m_min} - ${r.m_max}</td>
            <td class="p-3 border-b border-slate-700">${r.r_min} - ${r.r_max}</td>
        `;
        tbody.appendChild(tr);
    });
    
    document.getElementById('thicknessTableModal').classList.remove('hidden');
}

// --- 4. 表單建檔與編輯功能 ---
window.adjManual = function(id, delta, min, max) {
    const input = document.getElementById(id);
    if (!input) return;
    let val = parseInt(input.value) || 0;
    val += delta;
    if (val < min) val = min;
    if (val > max) val = max;
    input.value = val;
};

window.addThicknessRecord = function() {
    const date = document.getElementById('th_date').value || new Date().toISOString().split('T')[0];
    const f_min = document.getElementById('th_f_min').value;
    const f_max = document.getElementById('th_f_max').value;
    const m_min = document.getElementById('th_m_min').value;
    const m_max = document.getElementById('th_m_max').value;
    const r_min = document.getElementById('th_r_min').value;
    const r_max = document.getElementById('th_r_max').value;
    
    if (!f_min && !f_max) return alert("請至少輸入前段數據");
    
    currentThicknessRecords.unshift({ date, f_min, f_max, m_min, m_max, r_min, r_max });
    renderEditRecords();
};

window.addNgRecord = function() {
    const date = document.getElementById('ng_date').value || new Date().toISOString().split('T')[0];
    const location = document.getElementById('ng_location').options[document.getElementById('ng_location').selectedIndex].text;
    const reason = document.getElementById('ng_reason').value;
    
    currentNgRecords.unshift({ date, location, reason });
    renderEditRecords();
};

window.addRemark = function() {
    const text = document.getElementById('new_remark').value.trim();
    if(!text) return;
    const date = new Date().toISOString().split('T')[0];
    currentRemarks.unshift({ date, text });
    document.getElementById('new_remark').value = '';
    renderEditRecords();
};

function renderEditRecords() {
    const tList = document.getElementById('thicknessList');
    tList.innerHTML = '';
    currentThicknessRecords.forEach((r, idx) => {
        tList.innerHTML += `<div class="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-700 text-xs">
            <span><b>${r.date}</b> | 前:${r.f_min}-${r.f_max} 中:${r.m_min}-${r.m_max} 後:${r.r_min}-${r.r_max}</span>
            <button type="button" onclick="currentThicknessRecords.splice(${idx}, 1); renderEditRecords()" class="text-red-400 hover:text-red-300">刪除</button>
        </div>`;
    });
    
    const nList = document.getElementById('ngList');
    nList.innerHTML = '';
    currentNgRecords.forEach((r, idx) => {
        nList.innerHTML += `<div class="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-700 text-xs">
            <span><b>${r.date}</b> | ${r.location} - ${r.reason}</span>
            <button type="button" onclick="currentNgRecords.splice(${idx}, 1); renderEditRecords()" class="text-red-400 hover:text-red-300">刪除</button>
        </div>`;
    });
    
    const rList = document.getElementById('remarksList');
    rList.innerHTML = '';
    currentRemarks.forEach((r, idx) => {
        rList.innerHTML += `<div class="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-700 text-xs">
            <span>${r.text} <span class="text-slate-500">(${r.date})</span></span>
            <button type="button" onclick="currentRemarks.splice(${idx}, 1); renderEditRecords()" class="text-red-400 hover:text-red-300">刪除</button>
        </div>`;
    });
}

function fillAutoRecip() {
    ['up_turn_left','up_turn_right','down_turn_left','down_turn_right'].forEach(id => {
        document.getElementById(id).value = '自動';
    });
}

async function handleImageUpload(e) {
    const file = e.target.files[0];
    if(!file) return;
    
    const reader = new FileReader();
    reader.onload = function(evt) {
        document.getElementById('regPreviewBox').classList.remove('hidden');
        document.getElementById('regPreviewImg').src = evt.target.result;
    };
    reader.readAsDataURL(file);
    
    if(!sysSettings.gasUrl) return;
    document.getElementById('loadingOverlay').classList.remove('hidden');
    document.getElementById('loadingText').textContent = "圖片上傳中...";
    
    try {
        const base64 = await toBase64(file);
        const res = await fetch(sysSettings.gasUrl, {
            method: 'POST',
            body: JSON.stringify({ filename: file.name, mimetype: file.type, data: base64.split(',')[1] })
        });
        const result = await res.json();
        if(result.url) {
            uploadedImageUrl = result.url;
            alert("雲端圖片上傳成功！");
        }
    } catch(err) {
        console.error("Upload error", err);
        alert("上傳失敗: " + err.message);
    } finally {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }
}

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const itemName = document.getElementById('item_name').value.trim();
    const category = document.getElementById('reg_category').value;
    
    if(!itemName || !category) return alert("請輸入完整料號與選擇膜厚類別！");
    
    document.getElementById('loadingOverlay').classList.remove('hidden');
    document.getElementById('loadingText').textContent = "正在同步資料庫...";
    
    const payload = {
        item_name: itemName,
        category: category,
        image_url: uploadedImageUrl || (currentItem ? currentItem.image_url : null),
        data: {
            auto_guns: {
                gun_1: document.getElementById('gun_1').value,
                gun_2: document.getElementById('gun_2').value,
                gun_3: document.getElementById('gun_3').value,
                gun_4: document.getElementById('gun_4').value,
                gun_5: document.getElementById('gun_5').value,
                gun_6: document.getElementById('gun_6').value,
                gun_7: document.getElementById('gun_7').value,
                gun_8: document.getElementById('gun_8').value
            },
            reciprocator: {
                speed_left: document.getElementById('speed_left').value,
                speed_right: document.getElementById('speed_right').value,
                up_turn_left: document.getElementById('up_turn_left').value,
                up_turn_right: document.getElementById('up_turn_right').value,
                down_turn_left: document.getElementById('down_turn_left').value,
                down_turn_right: document.getElementById('down_turn_right').value,
                dist_left: document.getElementById('dist_left').value,
                dist_right: document.getElementById('dist_right').value
            },
            electrical: {
                voltage: document.getElementById('voltage').value,
                current: document.getElementById('current').value
            },
            manual_a: getManualData('a'),
            manual_b: getManualData('b'),
            thickness_records: currentThicknessRecords,
            ng_records: currentNgRecords,
            remarks: currentRemarks
        }
    };
    
    try {
        if(currentItem) {
            const { error } = await supabase.from(TABLE_NAME).update(payload).eq('id', currentItem.id);
            if(error) throw error;
            alert("資料更新成功！");
        } else {
            const { error } = await supabase.from(TABLE_NAME).insert([payload]);
            if(error) throw error;
            alert("建檔成功！");
        }
        await checkDbConnection();
        switchTab('query');
    } catch(err) {
        alert("儲存失敗：" + err.message);
    } finally {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }
}

function getManualData(prefix) {
    let obj = {};
    const fields = ['powder','air','voltage','current','nozzle','ring','spray_count','spray_left','spray_top','spray_bottom','spray_right','spray_mid_1','spray_mid_2','spray_mid_3','spray_mid_4'];
    fields.forEach(f => {
        const el = document.getElementById(`${prefix}_${f}`);
        if(el) obj[f] = el.value;
    });
    return obj;
}

function enterEditMode() {
    if(!currentItem) return;
    document.getElementById('formTitle').innerHTML = '📝 編輯參數資料';
    document.getElementById('cancelEditBtn').classList.remove('hidden');
    
    document.getElementById('item_name').value = currentItem.item_name;
    document.getElementById('reg_category').value = currentItem.category || "";
    
    if(currentItem.image_url) {
        document.getElementById('regPreviewBox').classList.remove('hidden');
        document.getElementById('regPreviewImg').src = currentItem.image_url;
        uploadedImageUrl = currentItem.image_url;
    }
    
    let d = currentItem.data || {};
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch(e){ d = {}; } }
    
    if(d.auto_guns) {
        for(let i=1; i<=8; i++) document.getElementById(`gun_${i}`).value = d.auto_guns[`gun_${i}`] || '';
    }
    if(d.reciprocator) {
        ['speed_left','speed_right','up_turn_left','up_turn_right','down_turn_left','down_turn_right','dist_left','dist_right'].forEach(k => {
            document.getElementById(k).value = d.reciprocator[k] || '';
        });
    }
    if(d.electrical) {
        document.getElementById('voltage').value = d.electrical.voltage || '';
        document.getElementById('current').value = d.electrical.current || '';
    }
    if(d.manual_a) Object.keys(d.manual_a).forEach(k => { if(document.getElementById(`a_${k}`)) document.getElementById(`a_${k}`).value = d.manual_a[k]; });
    if(d.manual_b) Object.keys(d.manual_b).forEach(k => { if(document.getElementById(`b_${k}`)) document.getElementById(`b_${k}`).value = d.manual_b[k]; });
    
    currentThicknessRecords = d.thickness_records || [];
    currentNgRecords = d.ng_records || [];
    currentRemarks = d.remarks || [];
    
    renderEditRecords();
    switchTab('register');
}

function resetForm() {
    currentItem = null;
    document.getElementById('paramForm').reset();
    document.getElementById('formTitle').innerHTML = '📝 參數資料建檔';
    document.getElementById('cancelEditBtn').classList.add('hidden');
    document.getElementById('regPreviewBox').classList.add('hidden');
    uploadedImageUrl = "";
    
    currentThicknessRecords = [];
    currentNgRecords = [];
    currentRemarks = [];
    renderEditRecords();
}

async function deleteCurrentItem() {
    if(!currentItem) return;
    if(confirm(`⚠️ 確定要刪除「${currentItem.item_name}」的所有資料嗎？此動作無法復原。`)) {
        document.getElementById('loadingOverlay').classList.remove('hidden');
        document.getElementById('loadingText').textContent = "刪除中...";
        try {
            const { error } = await supabase.from(TABLE_NAME).delete().eq('id', currentItem.id);
            if(error) throw error;
            alert("刪除成功！");
            resetForm();
            await checkDbConnection();
            document.getElementById('resultBoard').style.display = 'none';
            document.getElementById('actionButtons').classList.add('hidden');
        } catch(err) {
            alert("刪除失敗: " + err.message);
        } finally {
            document.getElementById('loadingOverlay').classList.add('hidden');
        }
    }
}
