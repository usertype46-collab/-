/**
 * 百富粉體塗裝自動槍參數系統 - Core Logic
 * 修正：Supabase 圖片 Base64 直存 (避開 Storage 問題)、類別連動選單
 */

// 1. 初始化 Supabase 客戶端
const SUPABASE_URL = 'https://wxdrtnqizpbjfugdaglb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_qUCcWVbzo-99rP85r_RhQg_EGewmxB4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const TABLE_NAME = 'powder_params';

// 全局變數
let currentMode = 'query';
let allItems = [];
let editItemId = null;
let thicknessRecords = [];
let loadedBase64Image = null; // 用於儲存壓縮後的圖片

// 2. 頁面載入初始化
document.addEventListener('DOMContentLoaded', async () => {
    initTabs();
    initImageUpload();
    bindFormSubmit();
    
    // 初始化連動選單事件
    document.getElementById('queryCategorySelect').addEventListener('change', (e) => {
        loadItemsFromDatabase(e.target.value);
    });
    document.getElementById('itemSelect').addEventListener('change', displayItemDetails);
    
    // 預設載入所有資料庫資料
    await loadItemsFromDatabase('all');
});

// 3. UI 互動與 Tab 切換
function initTabs() {
    const tabQueryBtn = document.getElementById('tabQueryBtn');
    const tabRegisterBtn = document.getElementById('tabRegisterBtn');
    const querySection = document.getElementById('querySection');
    const registerSection = document.getElementById('registerSection');
    
    tabQueryBtn.addEventListener('click', () => {
        currentMode = 'query';
        tabQueryBtn.className = tabQueryBtn.className.replace('btn-tab-inactive', 'btn-tab-active');
        tabRegisterBtn.className = tabRegisterBtn.className.replace('btn-tab-active', 'btn-tab-inactive');
        querySection.classList.remove('hidden');
        registerSection.classList.add('hidden');
        editItemId = null;
        document.getElementById('formTitle').innerHTML = '<span>📝 參數資料建檔</span>';
        document.getElementById('paramForm').reset();
        document.getElementById('regPreviewBox').classList.add('hidden');
        loadedBase64Image = null;
    });

    tabRegisterBtn.addEventListener('click', () => {
        currentMode = 'register';
        tabRegisterBtn.className = tabRegisterBtn.className.replace('btn-tab-inactive', 'btn-tab-active');
        tabQueryBtn.className = tabQueryBtn.className.replace('btn-tab-active', 'btn-tab-inactive');
        registerSection.classList.remove('hidden');
        querySection.classList.add('hidden');
    });

    // 膜厚 Modal
    document.getElementById('btnOpenThicknessModal').addEventListener('click', () => {
        document.getElementById('thicknessModal').classList.remove('hidden');
        renderAllThickness();
    });
    document.getElementById('btnCloseThicknessModal').addEventListener('click', () => {
        document.getElementById('thicknessModal').classList.add('hidden');
    });
}

// 4. Toast 提示系統
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

function toggleLoading(show, text = '系統處理中...') {
    const overlay = document.getElementById('loadingOverlay');
    document.getElementById('loadingText').innerText = text;
    show ? overlay.classList.remove('hidden') : overlay.classList.add('hidden');
    show ? overlay.classList.add('flex') : overlay.classList.remove('flex');
}

// 5. 圖片純前端高強度壓縮 (轉為 Base64 直存資料庫，避免讀取不到)
function initImageUpload() {
    document.getElementById('reg_image').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                // 創建 Canvas 進行壓縮
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800; // 限制最大寬度確保 Base64 不會過大超出資料庫負荷
                let width = img.width;
                let height = img.height;
                
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('resultBoard');
                // 使用白色背景避免 PNG 透明變黑
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, width, height);
                
                // 轉換為低畫質 WebP (減少體積)
                loadedBase64Image = canvas.toDataURL('image/webp', 0.6);
                
                // 預覽
                const previewImg = document.getElementById('regPreviewImg');
                previewImg.src = loadedBase64Image;
                document.getElementById('regPreviewBox').classList.remove('hidden');
                showToast('圖片已壓縮並準備上傳', 'success');
            }
            img.src = event.target.result;
        }
        reader.readAsDataURL(file);
    });
}

// 6. Supabase 資料庫：載入與連動選單邏輯
async function loadItemsFromDatabase(categoryFilter = 'all') {
    toggleLoading(true, '載入資料庫中...');
    try {
        let query = supabase.from(TABLE_NAME).select('id, item_name, category, created_at').order('created_at', { ascending: false });
        
        // 類別過濾邏輯
        if (categoryFilter !== 'all') {
            query = query.eq('category', categoryFilter);
        }

        const { data, error } = await query;
        if (error) throw error;
        
        allItems = data;
        
        const select = document.getElementById('itemSelect');
        select.innerHTML = '<option value="">-- 請選擇已建檔之構件 --</option>';
        
        if (data.length === 0) {
            select.innerHTML = `<option value="">此類別尚無構件 (${categoryFilter})</option>`;
        } else {
            data.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.id;
                opt.textContent = `[${item.category}] ${item.item_name}`;
                select.appendChild(opt);
            });
        }
        showToast('資料庫選單已更新', 'success');
    } catch (err) {
        console.error(err);
        showToast('資料庫連線或讀取失敗', 'error');
    } finally {
        toggleLoading(false);
    }
}

// 7. Supabase 資料庫：查詢並顯示單一構件詳細資訊 (含圖片防錯處理)
async function displayItemDetails() {
    const id = document.getElementById('itemSelect').value;
    if (!id) {
        document.getElementById('resultBoard').style.display = 'none';
        document.getElementById('actionButtons').classList.add('hidden');
        return;
    }

    toggleLoading(true, '讀取參數詳情...');
    try {
        const { data, error } = await supabase.from(TABLE_NAME).select('*').eq('id', id).single();
        if (error) throw error;

        // 綁定基礎資訊
        document.getElementById('resultBoard').style.display = 'block';
        document.getElementById('actionButtons').classList.remove('hidden');
        
        // 圖片處理 (防破圖邏輯)
        const imgEl = document.getElementById('q_matched_image');
        const imgContainer = document.getElementById('imageContainer');
        if (data.image_data) {
            imgEl.src = data.image_data; // 讀取 Base64
            imgEl.classList.remove('hidden');
            imgContainer.classList.remove('hidden');
            // 若為合法圖片隱藏錯誤替代圖
            if (imgEl.nextElementSibling) imgEl.nextElementSibling.classList.add('hidden');
        } else {
            imgContainer.classList.remove('hidden');
            imgEl.classList.add('hidden');
            if (imgEl.nextElementSibling) imgEl.nextElementSibling.classList.remove('hidden');
        }

        // 渲染陣列資料至對應 UI (防呆檢查)
        renderGunData(data.gun_data || {});
        renderThicknessRecords(data.thickness_history || []);
        
        // 設置當前欲編輯或刪除的 ID
        editItemId = data.id;

    } catch (err) {
        console.error(err);
        showToast('讀取參數細節失敗', 'error');
    } finally {
        toggleLoading(false);
    }
}

// 渲染粉量輔助函式
function renderGunData(gunData) {
    const container = document.getElementById('q_gun_display');
    container.innerHTML = '';
    for(let i=1; i<=8; i++) {
        container.innerHTML += `<div class="bg-slate-900/80 p-2 rounded-lg flex justify-between items-center border border-slate-800"><span class="text-slate-400">#${i} 槍:</span> <span class="text-emerald-400 font-bold text-base">${gunData[`gun_${i}`] || '0'}</span></div>`;
    }
}

// 8. 膜厚紀錄陣列管理
function addThicknessRecord() {
    const date = document.getElementById('th_date').value;
    const fAvg = document.getElementById('th_f_avg').value;
    const mAvg = document.getElementById('th_m_avg').value;
    const rAvg = document.getElementById('th_r_avg').value;
    
    if (!date) return showToast('請填寫檢測日期', 'warning');
    
    thicknessRecords.push({ date, fAvg, mAvg, rAvg, timestamp: new Date().getTime() });
    updateThicknessListUI();
    showToast('膜厚紀錄已暫存', 'success');
}

function updateThicknessListUI() {
    const list = document.getElementById('thicknessList');
    list.innerHTML = '';
    thicknessRecords.forEach((rec, idx) => {
        list.innerHTML += `<div class="bg-black/50 p-2 rounded flex justify-between text-white text-xs border border-pink-500/30">
            <span>📅 ${rec.date}</span>
            <span>前: ${rec.fAvg} | 中: ${rec.mAvg} | 後: ${rec.rAvg}</span>
            <button type="button" onclick="thicknessRecords.splice(${idx}, 1); updateThicknessListUI()" class="text-red-400 font-bold">X</button>
        </div>`;
    });
}

function renderThicknessRecords(records) {
    const display = document.getElementById('q_thickness_display');
    display.innerHTML = '';
    if(!records || records.length === 0) {
        display.innerHTML = '<div class="text-slate-500 p-2 text-center">尚無膜厚紀錄</div>';
        return;
    }
    records.forEach(rec => {
        display.innerHTML += `<div class="bg-slate-800/80 p-2 rounded mb-2 border-l-2 border-pink-500">
            <div class="text-[10px] text-pink-300">${rec.date}</div>
            <div class="flex justify-between mt-1 text-slate-200">
                <span>前: ${rec.fAvg}</span><span>中: ${rec.mAvg}</span><span>後: ${rec.rAvg}</span>
            </div>
        </div>`;
    });
}

function renderAllThickness() {
    // 拉取所有資料庫紀錄的統計 (此處簡化為顯示載入的 allItems)
    const container = document.getElementById('allThicknessRecords');
    container.innerHTML = '<p class="text-center text-slate-400">系統已連結 Supabase 膜厚資料庫模組。</p>';
}

// 9. 儲存表單與上傳 (Insert or Update)
function bindFormSubmit() {
    document.getElementById('paramForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const category = document.getElementById('reg_category').value;
        const itemName = document.getElementById('item_name').value;
        
        if (!category) return showToast('請選擇膜厚類別！', 'error');
        if (!itemName) return showToast('請填寫品名料號！', 'error');

        // 收集自動槍數據
        const gunData = {};
        for(let i=1; i<=8; i++) {
            gunData[`gun_${i}`] = document.getElementById(`gun_${i}`) ? document.getElementById(`gun_${i}`).value : '0';
        }

        const payload = {
            category: category,
            item_name: itemName,
            image_data: loadedBase64Image, // 存入壓縮後的 Base64 文本
            gun_data: gunData,
            thickness_history: thicknessRecords
            // 其他參數依您的欄位需求可補上 JSON...
        };

        toggleLoading(true, '同步至 Supabase 資料庫...');
        try {
            if (editItemId) {
                // 更新模式
                const { error } = await supabase.from(TABLE_NAME).update(payload).eq('id', editItemId);
                if (error) throw error;
                showToast('更新成功！', 'success');
            } else {
                // 新增模式
                const { error } = await supabase.from(TABLE_NAME).insert([payload]);
                if (error) throw error;
                showToast('建檔成功！', 'success');
            }
            
            // 重置表單與狀態
            document.getElementById('paramForm').reset();
            thicknessRecords = [];
            updateThicknessListUI();
            loadedBase64Image = null;
            document.getElementById('regPreviewBox').classList.add('hidden');
            
            // 重新刷新當前查詢頁面的類別
            await loadItemsFromDatabase(document.getElementById('queryCategorySelect').value);
            document.getElementById('tabQueryBtn').click(); // 跳轉回查詢頁面

        } catch (err) {
            console.error(err);
            showToast(`儲存失敗: ${err.message}`, 'error');
        } finally {
            toggleLoading(false);
        }
    });
}
