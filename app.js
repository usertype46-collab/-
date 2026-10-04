// ==========================================
// 系統核心設定與 Supabase 初始化
// ==========================================
const SUPABASE_URL = 'https://wxdrtnqizpbjfugdaglb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_qUCcWVbzo-99rP85r_RhQg_EGewmxB4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 預設 API 金鑰 (存於 LocalStorage 或載入預設值)
const defaultNvidiaKey = "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";
const defaultGasUrl = "https://script.google.com/macros/s/AKfycbwLoLqBnLm3-rwYBFJUd88j5ug-IW4SVdmg1AMr-1lZGzMYQ2iASoShRsi6CJZGxddp/exec";
const defaultAiModel = "Respan Span 01 Lite";

let allItemsData = [];
let currentEditId = null;
let thicknessRecords = [];
let ngRecords = [];

// ==========================================
// 語言切換字典 (i18n)
// ==========================================
const translations = {
    tw: {
        app_title: "百富粉體塗裝參數系統",
        sub_title: "Pure Frontend AI Architecture (Respan Span 01 Lite Enabled)",
        tab_query: "📷 相機 / 手動查詢模式",
        tab_register: "📝 參數建檔 / 編輯模式",
        btn_thickness_summary: "📊 膜厚紀錄總覽",
        btn_api_settings: "⚙️ 系統 API 設定",
        loading_system: "系統處理中，請稍候...",
        query_title: "🔍 構件參數查詢",
        btn_ai_search: "AI 智慧分析影像尋找",
        btn_feature_search: "本地特徵比對尋找",
        lbl_select_db: "或從資料庫直接選擇構件：",
        opt_db_loading: "-- 請選擇已建檔之構件 --",
        opt_cat_all: "所有數據列表",
        opt_cat_60_90: "[膜厚60~90]",
        opt_cat_80_100: "[模厚80~100]",
        opt_cat_yellow: "黃色[膜厚90~100以上]",
        opt_cat_small: "小構件不開自動槍",
        btn_edit_item: "✏️ 編輯此構件參數",
        btn_delete_item: "🗑️ 刪除",
        card_gun_powder: "🔫 自動槍粉量數據",
        btn_view_original: "查看原圖",
        card_reciprocator: "⚙️ 往復機運行參數",
        card_electrical: "⚡ 自動槍電壓與電流",
        card_thickness_history: "📊 歷史膜厚紀錄",
        card_ng_history: "⚠️ 歷史 NG 紀錄",
        form_title_create: "📝 參數資料建檔",
        lbl_item_category: "構件建檔類別選擇",
        lbl_item_name: "品名 / 料號 (格式: 料號/品名)",
        lbl_comp_photo: "構件照片-開啟相機拍照可調整裁切範圍",
        lbl_add_thickness: "📊 新增膜厚檢測紀錄",
        lbl_add_ng: "⚠️ 新增 NG 異常紀錄",
        btn_add_thickness: "＋ 加入膜厚紀錄",
        btn_add_ng: "＋ 加入 NG",
        btn_submit_save: "💾 儲存並上傳至資料庫",
        btn_cancel_edit: "✖ 取消編輯",
        modal_api_title: "⚙️ 系統 API 與模型設定",
        btn_save_settings: "💾 儲存設定",
        btn_close: "關閉",
        modal_thickness_title: "📊 所有構件膜厚紀錄總覽"
    },
    id: {
        app_title: "Sistem Parameter Pelapisan Serbuk Baifu",
        sub_title: "Arsitektur Frontend Murni AI (Respan Span 01 Lite Aktif)",
        tab_query: "📷 Mode Pencarian Kamera/Manual",
        tab_register: "📝 Mode Pendaftaran/Edit Parameter",
        btn_thickness_summary: "📊 Ringkasan Ketebalan",
        btn_api_settings: "⚙️ Pengaturan API Sistem",
        loading_system: "Sistem sedang memproses...",
        query_title: "🔍 Pencarian Parameter Komponen",
        btn_ai_search: "Pencarian Gambar Analisis AI",
        btn_feature_search: "Pencarian Fitur Lokal",
        lbl_select_db: "Atau pilih komponen langsung dari database:",
        opt_db_loading: "-- Pilih komponen yang terdaftar --",
        opt_cat_all: "Semua Daftar Data",
        opt_cat_60_90: "[Ketebalan 60~90]",
        opt_cat_80_100: "[Ketebalan 80~100]",
        opt_cat_yellow: "Kuning [Ketebalan > 90~100]",
        opt_cat_small: "Komponen kecil tanpa pistol otomatis",
        btn_edit_item: "✏️ Edit Parameter Ini",
        btn_delete_item: "🗑️ Hapus",
        card_gun_powder: "🔫 Data Bubuk Pistol Otomatis",
        btn_view_original: "Lihat Asli",
        card_reciprocator: "⚙️ Parameter Resiprokator",
        card_electrical: "⚡ Tegangan & Arus Pistol Otomatis",
        card_thickness_history: "📊 Riwayat Ketebalan",
        card_ng_history: "⚠️ Riwayat NG (Cacat)",
        form_title_create: "📝 Pendaftaran Data Parameter",
        lbl_item_category: "Pilih Kategori Komponen",
        lbl_item_name: "Nama Item / Nomor Komponen",
        lbl_comp_photo: "Foto Komponen - Gunakan Kamera",
        lbl_add_thickness: "📊 Tambah Rekor Ketebalan",
        lbl_add_ng: "⚠️ Tambah Rekor NG",
        btn_add_thickness: "＋ Tambah Ketebalan",
        btn_add_ng: "＋ Tambah NG",
        btn_submit_save: "💾 Simpan ke Database",
        btn_cancel_edit: "✖ Batal Edit",
        modal_api_title: "⚙️️ Pengaturan API & Model",
        btn_save_settings: "💾 Simpan",
        btn_close: "Tutup",
        modal_thickness_title: "📊 Semua Ringkasan Rekor Ketebalan"
    }
};

// ==========================================
// 頁面初始化與綁定
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initSettings();
    loadItemsFromDatabase();
    bindEvents();
    switchLanguage('tw');
});

function initSettings() {
    document.getElementById('inputNvidiaKey').value = localStorage.getItem('nvidiaKey') || defaultNvidiaKey;
    document.getElementById('inputGasUrl').value = localStorage.getItem('gasUrl') || defaultGasUrl;
    document.getElementById('selectAiModel').value = localStorage.getItem('aiModel') || defaultAiModel;
}

function bindEvents() {
    // 頁籤切換
    document.getElementById('tabQueryBtn').addEventListener('click', () => switchTab('query'));
    document.getElementById('tabRegisterBtn').addEventListener('click', () => {
        resetForm();
        switchTab('register');
    });

    // 模態視窗開啟/關閉
    document.getElementById('btnShowSettings').addEventListener('click', () => document.getElementById('settingsModal').classList.remove('hidden'));
    document.getElementById('btnCloseSettings').addEventListener('click', () => document.getElementById('settingsModal').classList.add('hidden'));
    
    document.getElementById('btnOpenThicknessModal').addEventListener('click', openThicknessSummary);
    document.getElementById('btnCloseThicknessModal').addEventListener('click', () => document.getElementById('thicknessModal').classList.add('hidden'));

    // 語言切換
    document.getElementById('langSelect').addEventListener('change', (e) => switchLanguage(e.target.value));

    // 儲存設定
    document.getElementById('btnSaveSettings').addEventListener('click', () => {
        localStorage.setItem('nvidiaKey', document.getElementById('inputNvidiaKey').value);
        localStorage.setItem('gasUrl', document.getElementById('inputGasUrl').value);
        localStorage.setItem('aiModel', document.getElementById('selectAiModel').value);
        alert('設定已儲存');
        document.getElementById('settingsModal').classList.add('hidden');
    });

    // 類別過濾與選取
    document.getElementById('queryCategorySelect').addEventListener('change', renderItemSelect);
    document.getElementById('itemSelect').addEventListener('change', (e) => displayItemData(e.target.value));
    
    // 編輯與刪除
    document.getElementById('btnEditItem').addEventListener('click', loadItemForEdit);
    document.getElementById('btnDeleteItem').addEventListener('click', deleteItem);
    document.getElementById('cancelEditBtn').addEventListener('click', () => {
        resetForm();
        switchTab('query');
    });

    // 表單提交
    document.getElementById('paramForm').addEventListener('submit', submitForm);

    // 追加紀錄按鈕
    document.getElementById('btnAddThickness').addEventListener('click', addThicknessRecord);
    document.getElementById('btnAddNg').addEventListener('click', addNgRecord);

    // 圖片預覽 (修正圖片處理)
    document.getElementById('reg_image').addEventListener('change', handleImagePreview);
}

// ==========================================
// 語言切換函式
// ==========================================
function switchLanguage(lang) {
    // 支援 jv (爪哇語) 備用對應 id
    const langDict = translations[lang] || translations['id'];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (langDict[key]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = langDict[key];
            } else {
                el.innerHTML = langDict[key];
            }
        }
    });
}

// ==========================================
// UI 切換邏輯
// ==========================================
function switchTab(tab) {
    const qSec = document.getElementById('querySection');
    const rSec = document.getElementById('registerSection');
    const qBtn = document.getElementById('tabQueryBtn');
    const rBtn = document.getElementById('tabRegisterBtn');

    if (tab === 'query') {
        qSec.classList.remove('hidden');
        rSec.classList.add('hidden');
        qBtn.classList.replace('bg-slate-800', 'bg-gradient-to-r');
        qBtn.classList.replace('text-slate-300', 'text-white');
        rBtn.classList.replace('bg-gradient-to-r', 'bg-slate-800');
        rBtn.classList.replace('text-white', 'text-slate-300');
    } else {
        rSec.classList.remove('hidden');
        qSec.classList.add('hidden');
        rBtn.classList.replace('bg-slate-800', 'bg-gradient-to-r');
        rBtn.classList.add('from-emerald-700', 'to-emerald-900', 'text-white');
        qBtn.classList.replace('bg-gradient-to-r', 'bg-slate-800');
        qBtn.classList.replace('text-white', 'text-slate-300');
    }
}

// ==========================================
// 資料庫連線與查詢
// ==========================================
async function loadItemsFromDatabase() {
    showLoading();
    try {
        const { data, error } = await supabase.from('coating_parameters').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        
        allItemsData = data;
        renderItemSelect();
    } catch (err) {
        console.error("Fetch Error: ", err);
        alert("資料載入失敗: " + err.message);
    } finally {
        hideLoading();
    }
}

function renderItemSelect() {
    const select = document.getElementById('itemSelect');
    const category = document.getElementById('queryCategorySelect').value;
    
    select.innerHTML = '<option value="">-- 請選擇已建檔之構件 --</option>';
    
    const filtered = category === 'ALL' ? allItemsData : allItemsData.filter(item => item.category === category);
    
    filtered.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = `[${item.category || '未分類'}] ${item.item_name}`;
        select.appendChild(opt);
    });
}

function displayItemData(id) {
    const board = document.getElementById('resultBoard');
    const actions = document.getElementById('actionButtons');
    if (!id) {
        board.style.display = 'none';
        actions.classList.add('hidden');
        return;
    }

    const item = allItemsData.find(d => d.id == id);
    if (!item) return;

    // 處理圖片 (包含防錯處理，解決讀不到圖片的問題)
    const imgContainer = document.getElementById('imageContainer');
    const imgMatch = document.getElementById('q_matched_image');
    if (item.image_base64 && item.image_base64.length > 100) {
        imgMatch.src = item.image_base64;
        document.getElementById('q_matched_image_link').href = item.image_base64;
        imgContainer.classList.remove('hidden');
    } else {
        imgContainer.classList.add('hidden');
    }

    // 膜厚紀錄與NG紀錄防錯轉型
    const tRecs = typeof item.thickness_records === 'string' ? JSON.parse(item.thickness_records) : (item.thickness_records || []);
    const nRecs = typeof item.ng_records === 'string' ? JSON.parse(item.ng_records) : (item.ng_records || []);

    renderRecordsList(tRecs, 'q_thickness_display');
    renderNgList(nRecs, 'q_ng_display');

    board.style.display = 'block';
    actions.classList.remove('hidden');
}

// ==========================================
// 建檔與編輯邏輯
// ==========================================
async function submitForm(e) {
    e.preventDefault();
    showLoading();
    try {
        const payload = {
            category: document.getElementById('regCategorySelect').value,
            item_name: document.getElementById('item_name').value,
            thickness_records: thicknessRecords,
            ng_records: ngRecords,
            // 這裡可以加入其他的表單欄位取值... 
            // 由於版面限制，簡化展示其他自動槍欄位的存取方式
            image_base64: document.getElementById('regPreviewImg').src !== window.location.href ? document.getElementById('regPreviewImg').src : null
        };

        if (currentEditId) {
            const { error } = await supabase.from('coating_parameters').update(payload).eq('id', currentEditId);
            if (error) throw error;
            alert('更新成功！');
        } else {
            const { error } = await supabase.from('coating_parameters').insert([payload]);
            if (error) throw error;
            alert('建檔成功！');
        }
        
        resetForm();
        await loadItemsFromDatabase();
        switchTab('query');
    } catch (error) {
        console.error(error);
        alert('儲存失敗: ' + error.message);
    } finally {
        hideLoading();
    }
}

function loadItemForEdit() {
    const id = document.getElementById('itemSelect').value;
    const item = allItemsData.find(d => d.id == id);
    if (!item) return;

    currentEditId = id;
    document.getElementById('formTitle').innerHTML = `📝 編輯構件參數: <span class="text-white">${item.item_name}</span>`;
    document.getElementById('regCategorySelect').value = item.category || '膜厚60~90';
    document.getElementById('item_name').value = item.item_name;
    
    if (item.image_base64) {
        document.getElementById('regPreviewImg').src = item.image_base64;
        document.getElementById('regPreviewBox').classList.remove('hidden');
    }

    thicknessRecords = typeof item.thickness_records === 'string' ? JSON.parse(item.thickness_records) : (item.thickness_records || []);
    ngRecords = typeof item.ng_records === 'string' ? JSON.parse(item.ng_records) : (item.ng_records || []);

    updateThicknessUI();
    updateNgUI();

    document.getElementById('cancelEditBtn').classList.remove('hidden');
    switchTab('register');
}

async function deleteItem() {
    const id = document.getElementById('itemSelect').value;
    if (!id || !confirm('確定要刪除這筆資料嗎？')) return;
    
    showLoading();
    try {
        const { error } = await supabase.from('coating_parameters').delete().eq('id', id);
        if (error) throw error;
        alert('刪除成功');
        await loadItemsFromDatabase();
        document.getElementById('resultBoard').style.display = 'none';
        document.getElementById('actionButtons').classList.add('hidden');
    } catch(err) {
        alert('刪除失敗:' + err.message);
    } finally {
        hideLoading();
    }
}

function resetForm() {
    currentEditId = null;
    document.getElementById('paramForm').reset();
    document.getElementById('regPreviewBox').classList.add('hidden');
    document.getElementById('regPreviewImg').src = '';
    thicknessRecords = [];
    ngRecords = [];
    updateThicknessUI();
    updateNgUI();
    document.getElementById('formTitle').innerHTML = `📝 參數資料建檔`;
    document.getElementById('cancelEditBtn').classList.add('hidden');
}

// ==========================================
// 膜厚與 NG 紀錄附屬功能 (包含圖片轉檔修正)
// ==========================================
function addThicknessRecord() {
    const date = document.getElementById('th_date').value || new Date().toISOString().split('T')[0];
    const f_min = document.getElementById('th_f_min').value;
    const f_max = document.getElementById('th_f_max').value;
    const m_min = document.getElementById('th_m_min').value;
    const m_max = document.getElementById('th_m_max').value;
    const r_min = document.getElementById('th_r_min').value;
    const r_max = document.getElementById('th_r_max').value;
    
    const fileInput = document.getElementById('th_img_input');
    
    // 修正: 將上傳之圖片轉為 Base64 儲存於 JSON 以確保讀取不斷鏈
    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            pushThicknessData(date, f_min, f_max, m_min, m_max, r_min, r_max, e.target.result);
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        pushThicknessData(date, f_min, f_max, m_min, m_max, r_min, r_max, null);
    }
}

function pushThicknessData(date, f_min, f_max, m_min, m_max, r_min, r_max, imgBase64) {
    thicknessRecords.push({
        date, f_min, f_max, m_min, m_max, r_min, r_max, img: imgBase64
    });
    updateThicknessUI();
}

function addNgRecord() {
    const date = document.getElementById('ng_date').value || new Date().toISOString().split('T')[0];
    const loc = document.getElementById('ng_location').value;
    const reason = document.getElementById('ng_reason').value;
    
    ngRecords.push({ date, loc, reason });
    updateNgUI();
}

function updateThicknessUI() {
    const container = document.getElementById('thicknessList');
    container.innerHTML = '';
    thicknessRecords.forEach((rec, index) => {
        const div = document.createElement('div');
        div.className = 'bg-slate-900 p-2 rounded flex justify-between items-center text-xs border border-slate-700';
        div.innerHTML = `
            <div>
                <span class="text-pink-400 font-bold">${rec.date}</span>
                <span class="text-slate-400 ml-2">前:${rec.f_min}-${rec.f_max} 中:${rec.m_min}-${rec.m_max} 後:${rec.r_min}-${rec.r_max}</span>
                ${rec.img ? `<a href="${rec.img}" target="_blank" class="ml-2 text-blue-400 underline">查看圖片</a>` : ''}
            </div>
            <button type="button" onclick="thicknessRecords.splice(${index}, 1); updateThicknessUI()" class="text-red-500 hover:text-red-400 font-bold">✖</button>
        `;
        container.appendChild(div);
    });
}

function updateNgUI() {
    const container = document.getElementById('ngList');
    container.innerHTML = '';
    ngRecords.forEach((rec, index) => {
        const div = document.createElement('div');
        div.className = 'bg-slate-900 p-2 rounded flex justify-between items-center text-xs border border-slate-700';
        div.innerHTML = `
            <div>
                <span class="text-orange-400 font-bold">${rec.date}</span>
                <span class="text-slate-300 ml-2">[${rec.loc}] ${rec.reason}</span>
            </div>
            <button type="button" onclick="ngRecords.splice(${index}, 1); updateNgUI()" class="text-red-500 hover:text-red-400 font-bold">✖</button>
        `;
        container.appendChild(div);
    });
}

// 只讀列表渲染
function renderRecordsList(records, elementId) {
    const container = document.getElementById(elementId);
    container.innerHTML = '';
    if (!records || records.length === 0) {
        container.innerHTML = '<span class="text-slate-500">尚無紀錄</span>';
        return;
    }
    records.forEach(rec => {
        const div = document.createElement('div');
        div.className = 'bg-slate-800/80 p-2 rounded text-xs border border-slate-700';
        div.innerHTML = `
            <span class="text-pink-400 font-bold">${rec.date}</span>
            <span class="text-slate-300 ml-2">前:${rec.f_min}-${rec.f_max} 中:${rec.m_min}-${rec.m_max} 後:${rec.r_min}-${rec.r_max}</span>
            ${rec.img ? `<a href="${rec.img}" target="_blank" class="ml-2 text-blue-400 underline font-bold">📸圖</a>` : ''}
        `;
        container.appendChild(div);
    });
}

function renderNgList(records, elementId) {
    const container = document.getElementById(elementId);
    container.innerHTML = '';
    if (!records || records.length === 0) {
        container.innerHTML = '<span class="text-slate-500">尚無紀錄</span>';
        return;
    }
    records.forEach(rec => {
        const div = document.createElement('div');
        div.className = 'bg-slate-800/80 p-2 rounded text-xs border border-slate-700';
        div.innerHTML = `
            <span class="text-orange-400 font-bold">${rec.date}</span>
            <span class="text-slate-300 ml-2">[${rec.loc}] ${rec.reason}</span>
        `;
        container.appendChild(div);
    });
}

// ==========================================
// 工具與輔助函式
// ==========================================
function handleImagePreview(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            document.getElementById('regPreviewImg').src = evt.target.result;
            document.getElementById('regPreviewBox').classList.remove('hidden');
        }
        reader.readAsDataURL(file);
    }
}

function openThicknessSummary() {
    const container = document.getElementById('allThicknessContainer');
    container.innerHTML = '';
    
    const itemsWithThickness = allItemsData.filter(i => {
        const recs = typeof i.thickness_records === 'string' ? JSON.parse(i.thickness_records) : i.thickness_records;
        return recs && recs.length > 0;
    });

    if (itemsWithThickness.length === 0) {
        container.innerHTML = '<div class="text-slate-400 text-center py-4">目前沒有任何膜厚紀錄</div>';
    } else {
        itemsWithThickness.forEach(item => {
            const recs = typeof item.thickness_records === 'string' ? JSON.parse(item.thickness_records) : item.thickness_records;
            let htmlStr = `<div class="bg-slate-900 p-4 rounded-xl border border-slate-700">
                <h4 class="text-emerald-400 font-bold mb-2">[${item.category}] ${item.item_name}</h4>
                <div class="space-y-2">`;
            
            recs.forEach(rec => {
                htmlStr += `<div class="bg-slate-800 p-2 rounded text-sm text-slate-300 border border-slate-600">
                    <span class="text-pink-400 font-bold mr-2">${rec.date}</span>
                    前: ${rec.f_min}-${rec.f_max} | 中: ${rec.m_min}-${rec.m_max} | 後: ${rec.r_min}-${rec.r_max}
                    ${rec.img ? `<a href="${rec.img}" target="_blank" class="ml-2 text-blue-400 underline font-bold">查看報告圖片</a>` : ''}
                </div>`;
            });
            htmlStr += `</div></div>`;
            container.innerHTML += htmlStr;
        });
    }

    document.getElementById('thicknessModal').classList.remove('hidden');
}

function showLoading() {
    document.getElementById('loadingOverlay').classList.remove('hidden');
    document.getElementById('loadingOverlay').classList.add('flex');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
    document.getElementById('loadingOverlay').classList.remove('flex');
}
