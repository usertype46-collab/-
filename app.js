// app.js (Supabase 整合與前端邏輯)
document.addEventListener('DOMContentLoaded', () => {
    // 1. Supabase 連線設定 (修正 URL 與 KEY)
    const SUPABASE_URL = 'https://wxdrtnqizpbjfugdaglb.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_qUCcWVbzo-99rP85r_RhQg_EGewmxB4';
    
    // 初始化 Supabase 客戶端
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // 全局變數
    let dbItems = []; 
    let currentEditId = null;

    // DOM 元素綁定
    const tabQueryBtn = document.getElementById('tabQueryBtn');
    const tabRegisterBtn = document.getElementById('tabRegisterBtn');
    const querySection = document.getElementById('querySection');
    const registerSection = document.getElementById('registerSection');
    const queryCategorySelect = document.getElementById('queryCategorySelect');
    const itemSelect = document.getElementById('itemSelect');
    const paramForm = document.getElementById('paramForm');
    const regImage = document.getElementById('reg_image');
    
    // 2. 初始化與資料載入
    async function loadDataFromSupabase() {
        showLoading(true, "正在與 Supabase 同步資料...");
        try {
            // 假設資料表名稱為 powder_params (依據 HTML 裡的提示)
            const { data, error } = await supabase
                .from('powder_params')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            dbItems = data || [];
            
            // 初始化下拉選單
            updateItemSelectDropdown();
            showToast('success', '資料庫同步完成！');
        } catch (err) {
            console.error('Supabase 讀取錯誤:', err);
            showToast('error', 'Supabase 連線失敗或資料表不存在，請檢查 Console');
            itemSelect.innerHTML = '<option value="">-- 資料讀取失敗 --</option>';
        } finally {
            showLoading(false);
        }
    }

    // 3. 處理膜厚類別與構件連動篩選
    function updateItemSelectDropdown() {
        const selectedCategory = queryCategorySelect.value;
        itemSelect.innerHTML = '<option value="">-- 請選擇已建檔之構件 --</option>';

        let filteredItems = dbItems;
        if (selectedCategory !== 'all') {
            filteredItems = dbItems.filter(item => item.category === selectedCategory);
        }

        if (filteredItems.length === 0) {
            itemSelect.innerHTML = '<option value="">-- 此類別尚無構件紀錄 --</option>';
            return;
        }

        filteredItems.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.id;
            opt.textContent = `${item.item_name} ${item.category ? `(${item.category})` : ''}`;
            itemSelect.appendChild(opt);
        });
    }

    queryCategorySelect.addEventListener('change', updateItemSelectDropdown);

    // 4. 修正膜厚紀錄讀取不到圖片問題 (Base64 處理)
    function processImageForDisplay(base64Data, imgElementId) {
        const imgElement = document.getElementById(imgElementId);
        const container = imgElement.parentElement;
        
        if (!base64Data) {
            imgElement.src = '';
            container.classList.add('hidden');
            return;
        }

        // 檢查是否已經包含 Data URI Scheme，若無則主動補上
        let finalSrc = base64Data;
        if (!base64Data.startsWith('http') && !base64Data.startsWith('data:image')) {
            finalSrc = 'data:image/jpeg;base64,' + base64Data;
        }
        
        imgElement.src = finalSrc;
        
        // 綁定查看大圖連結
        const linkElement = document.getElementById(imgElementId + '_link');
        if (linkElement) {
            linkElement.href = finalSrc;
        }
        
        container.classList.remove('hidden');
    }

    // 圖片上傳轉 Base64
    regImage.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                // 為了避免 Supabase text 欄位過大，實務上會透過 Canvas 壓縮圖片，此處簡化處理
                const base64String = event.target.result;
                document.getElementById('regPreviewImg').src = base64String;
                document.getElementById('regPreviewImg').dataset.base64 = base64String;
                document.getElementById('regPreviewBox').classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });

    // 5. 儲存資料至 Supabase
    paramForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading(true, "正在儲存至 Supabase...");

        const category = document.getElementById('reg_category').value;
        const itemName = document.getElementById('item_name').value;
        const imageBase64 = document.getElementById('regPreviewImg').dataset.base64 || '';

        const payload = {
            category: category,
            item_name: itemName,
            image_base64: imageBase64,
            // 這裡可以整合其餘槍管參數，假設我們儲存在單一 JSON 欄位 parameters 裡以提高彈性
            parameters: {
                // 模擬獲取槍粉量
                guns: {
                    1: document.getElementById('gun_1')?.value || 0,
                    2: document.getElementById('gun_2')?.value || 0
                    // 依此類推
                },
                updated_at: new Date().toISOString()
            }
        };

        try {
            let res;
            if (currentEditId) {
                // 編輯模式
                res = await supabase.from('powder_params').update(payload).eq('id', currentEditId);
            } else {
                // 新增模式
                res = await supabase.from('powder_params').insert([payload]);
            }

            if (res.error) throw res.error;

            showToast('success', '參數儲存成功！');
            paramForm.reset();
            document.getElementById('regPreviewBox').classList.add('hidden');
            document.getElementById('regPreviewImg').dataset.base64 = '';
            currentEditId = null;
            
            // 重新讀取資料
            await loadDataFromSupabase();
            
            // 切換回查詢畫面
            tabQueryBtn.click();
        } catch (err) {
            console.error('儲存失敗:', err);
            showToast('error', '儲存失敗，請確認 Supabase 權限與連線');
        } finally {
            showLoading(false);
        }
    });

    // 選擇構件後渲染畫面
    itemSelect.addEventListener('change', (e) => {
        const selectedId = e.target.value;
        if (!selectedId) {
            document.getElementById('resultBoard').style.display = 'none';
            document.getElementById('actionButtons').classList.add('hidden');
            return;
        }

        const item = dbItems.find(i => i.id == selectedId);
        if (item) {
            document.getElementById('resultBoard').style.display = 'block';
            document.getElementById('actionButtons').classList.remove('hidden');
            
            // 完美修正讀取不到圖片的問題
            processImageForDisplay(item.image_base64, 'q_matched_image');
        }
    });

    // 6. UI 切換邏輯
    tabQueryBtn.addEventListener('click', () => {
        tabQueryBtn.classList.replace('btn-tab-inactive', 'btn-tab-active');
        tabRegisterBtn.classList.replace('btn-tab-active', 'btn-tab-inactive');
        querySection.classList.remove('hidden');
        registerSection.classList.add('hidden');
    });

    tabRegisterBtn.addEventListener('click', () => {
        tabRegisterBtn.classList.replace('btn-tab-inactive', 'btn-tab-active');
        tabQueryBtn.classList.replace('btn-tab-active', 'btn-tab-inactive');
        registerSection.classList.remove('hidden');
        querySection.classList.add('hidden');
        currentEditId = null;
        document.getElementById('formTitle').innerHTML = `<span>📝 參數資料建檔</span>`;
    });

    // 工具函式
    function showLoading(show, text) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            if (text) document.getElementById('loadingText').innerText = text;
            overlay.classList.remove('hidden');
            overlay.classList.add('flex');
        } else {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
        }
    }

    function showToast(type, message) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // Modal 控制
    document.getElementById('btnOpenThicknessModal').addEventListener('click', () => {
        document.getElementById('thicknessModal').classList.remove('hidden');
    });
    document.getElementById('btnCloseThicknessModal').addEventListener('click', () => {
        document.getElementById('thicknessModal').classList.add('hidden');
    });

    // 啟動加載資料
    loadDataFromSupabase();
});
