// 世界书模块 V2 - 参照SillyTavern设计
const WorldBookV2 = {
    // 当前状态
    currentBook: null,
    currentEntry: null,
    isMultiSelectMode: false,  // 是否在多选模式
    selectedEntryIds: new Set(),  // 选中的条目ID集合
    books: [],
    entries: [],

    // 全局设置管理
    globalSettings: null,

    // 初始化
    init() {
        // 初始化全局设置
        this.initGlobalSettings();

        this.loadData();
        this.bindEvents();
        this.render();
    },

    // 初始化全局设置
    initGlobalSettings() {
        // 尝试从localStorage加载
        const saved = localStorage.getItem('worldbook.globalSettings');
        if (saved) {
            this.globalSettings = JSON.parse(saved);
        } else {
            // 使用默认设置
            this.globalSettings = {
                scanDepth: 2,
                contextPercent: 25,
                tokenBudget: 2048,
                minActivations: 0,
                maxRecursion: 2,
                maxDepth: 100,
                insertionStrategy: 'evenly',
                includeNames: true,
                recursiveScan: true,
                caseSensitive: false,
                matchWholeWords: false,
                useGroupScoring: false,
                overflowAlert: true
            };
            // 直接写入默认设置到存储，避免读取未初始化的UI值
            localStorage.setItem('worldbook.globalSettings', JSON.stringify(this.globalSettings));
        }
        // 确保UI显示当前设置
        this.loadGlobalSettingsToUI();
    },

    // 切换全局设置面板
    toggleGlobalSettings() {
        const panel = document.getElementById('wb-global-settings');
        if (panel) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }
    },

    // 保存全局设置
    saveGlobalSettings() {
        // 从UI读取值
        this.globalSettings = {
            scanDepth: parseInt(document.getElementById('wb-scan-depth')?.value) || 2,
            contextPercent: parseInt(document.getElementById('wb-context-percent')?.value) || 25,
            tokenBudget: parseInt(document.getElementById('wb-token-budget')?.value) || 2048,
            minActivations: parseInt(document.getElementById('wb-min-activations')?.value) || 0,
            maxRecursion: parseInt(document.getElementById('wb-max-recursion')?.value) || 2,
            maxDepth: parseInt(document.getElementById('wb-max-depth')?.value) || 100,
            insertionStrategy: document.getElementById('wb-insertion-strategy')?.value || 'evenly',
            includeNames: document.getElementById('wb-include-names')?.checked ?? true,
            recursiveScan: document.getElementById('wb-recursive-scan')?.checked ?? true,
            caseSensitive: document.getElementById('wb-case-sensitive')?.checked ?? false,
            matchWholeWords: document.getElementById('wb-match-whole-words')?.checked ?? false,
            useGroupScoring: document.getElementById('wb-use-group-scoring')?.checked ?? false,
            overflowAlert: document.getElementById('wb-overflow-alert')?.checked ?? true
        };

        // 保存到localStorage
        localStorage.setItem('worldbook.globalSettings', JSON.stringify(this.globalSettings));

        alert('全局设置已保存！');
    },

    // 加载全局设置到UI
    loadGlobalSettingsToUI() {
        if (!this.globalSettings) return;

        const setIfExists = (id, value) => {
            const el = document.getElementById(id);
            if (el) {
                if (el.type === 'checkbox') {
                    el.checked = value;
                } else {
                    el.value = value;
                }
            }
        };

        setIfExists('wb-scan-depth', this.globalSettings.scanDepth);
        setIfExists('wb-context-percent', this.globalSettings.contextPercent);
        setIfExists('wb-token-budget', this.globalSettings.tokenBudget);
        setIfExists('wb-min-activations', this.globalSettings.minActivations);
        setIfExists('wb-max-recursion', this.globalSettings.maxRecursion);
        setIfExists('wb-max-depth', this.globalSettings.maxDepth);
        setIfExists('wb-insertion-strategy', this.globalSettings.insertionStrategy);
        setIfExists('wb-include-names', this.globalSettings.includeNames);
        setIfExists('wb-recursive-scan', this.globalSettings.recursiveScan);
        setIfExists('wb-case-sensitive', this.globalSettings.caseSensitive);
        setIfExists('wb-match-whole-words', this.globalSettings.matchWholeWords);
        setIfExists('wb-use-group-scoring', this.globalSettings.useGroupScoring);
        setIfExists('wb-overflow-alert', this.globalSettings.overflowAlert);
    },

    // 重置全局设置
    resetGlobalSettings() {
        if (confirm('确定要重置所有全局设置为默认值吗？')) {
            this.globalSettings = {
                scanDepth: 2,
                contextPercent: 25,
                tokenBudget: 2048,
                minActivations: 0,
                maxRecursion: 2,
                maxDepth: 100,
                insertionStrategy: 'evenly',
                includeNames: true,
                recursiveScan: true,
                caseSensitive: false,
                matchWholeWords: false,
                useGroupScoring: false,
                overflowAlert: true
            };
            // 先更新UI为默认值
            this.loadGlobalSettingsToUI();
            // 然后直接将默认值写入存储
            localStorage.setItem('worldbook.globalSettings', JSON.stringify(this.globalSettings));
            alert('已重置为默认设置！');
        }
    },
    
    // 加载数据
    loadData() {
        // 尝试迁移旧数据
        this.migrateOldData();

        // 加载世界书列表
        const booksData = localStorage.getItem('worldbook.books.v2');
        this.books = booksData ? JSON.parse(booksData) : [];

        // 加载条目
        const entriesData = localStorage.getItem('worldbook.entries.v2');
        this.entries = entriesData ? JSON.parse(entriesData) : [];

        // 如果没有世界书，创建默认的
        if (this.books.length === 0) {
            this.createDefaultBook();
        }
    },

    // 数据迁移方法
    migrateOldData() {
        // 检查是否有旧版本数据
        const oldWorldBook = StateManager.get()?.worldBook;
        if (!oldWorldBook || oldWorldBook.length === 0) return;

        // 检查是否已经迁移过
        if (localStorage.getItem('worldbook.migrated.v2')) return;

        console.log('开始迁移旧世界书数据...');

        // 创建默认世界书
        const defaultBook = {
            id: 'migrated_' + Date.now(),
            name: '迁移的世界书',
            description: '从旧版本迁移的世界书条目',
            scope: 'global',
            character: null,
            scanDepth: 2,
            tokenBudget: 2048,
            recursive: true,
            caseSensitive: false,
            matchWholeWords: false,
            createdAt: Date.now()
        };

        // 迁移条目
        const migratedEntries = oldWorldBook.map((rule, index) => ({
            id: rule.id || `migrated_entry_${index}`,
            bookId: defaultBook.id,
            name: rule.name || rule.key || '迁移的条目',
            keys: rule.triggers || [rule.key || ''],
            secondaryKeys: [],
            content: rule.content || rule.description || '',
            order: rule.priority || 100,
            depth: 4,
            logic: 'AND_ANY',
            selective: false,
            constant: rule.constant || false,
            probability: 100,
            position: rule.position || 'after_char',
            disableRecursion: false,
            scanDepth: false,
            recursionDepth: 2,
            bindType: 'global',
            characters: [],
            excludeMode: false,
            enabled: rule.enabled !== false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        }));

        // 保存迁移的数据
        this.books = [defaultBook];
        this.entries = migratedEntries;
        this.saveData();

        // 标记已迁移
        localStorage.setItem('worldbook.migrated.v2', 'true');

        console.log(`成功迁移 ${migratedEntries.length} 个条目`);
        alert(`已从旧版本迁移 ${migratedEntries.length} 个世界书条目！`);
    },
    
    // 保存数据
    saveData() {
        localStorage.setItem('worldbook.books.v2', JSON.stringify(this.books));
        localStorage.setItem('worldbook.entries.v2', JSON.stringify(this.entries));
    },
    
    // 创建默认世界书
    createDefaultBook() {
        const defaultBook = {
            id: 'default',
            name: '默认世界书',
            description: '系统默认的世界书',
            scope: 'global',
            character: null,
            scanDepth: 2,
            tokenBudget: 2048,
            recursive: true,
            caseSensitive: false,
            matchWholeWords: false,
            createdAt: Date.now()
        };
        
        this.books.push(defaultBook);
        this.currentBook = defaultBook;
        this.saveData();
    },
    
    // 渲染主界面
    render() {
        this.renderBookSelector();
        this.renderEntries();
    },
    
    // 渲染世界书选择器
    renderBookSelector() {
        const selector = document.getElementById('wb-current-book');
        if (!selector) return;

        selector.innerHTML = '<option value="">选择世界书...</option>';

        this.books.forEach(book => {
            const option = document.createElement('option');
            option.value = book.id;
            option.textContent = book.name;
            if (this.currentBook && this.currentBook.id === book.id) {
                option.selected = true;
            }
            selector.appendChild(option);
        });
    },
    
    // 渲染条目（简化版）
    renderEntries() {
        const container = document.getElementById('wb-entries-list');
        const emptyState = document.getElementById('wb-empty-state');
        const modeBar = document.getElementById('wb-mode-bar');

        if (!container || !this.currentBook) return;

        const bookEntries = this.entries.filter(e => e.bookId === this.currentBook.id);
        const searchTerm = (document.getElementById('wb-search')?.value || '').toLowerCase();

        let filteredEntries = bookEntries;
        if (searchTerm) {
            filteredEntries = bookEntries.filter(e => {
                const searchText = `${e.name} ${e.keys.join(' ')} ${e.content}`.toLowerCase();
                return searchText.includes(searchTerm);
            });
        }

        filteredEntries.sort((a, b) => b.order - a.order);
        
        // 清理旧的事件监听器，防止内存泄漏
        container.querySelectorAll('.wb-entry-item').forEach(item => {
            if (item._cleanupSwipeListener) {
                item._cleanupSwipeListener();
            }
        });
        
        container.innerHTML = '';

        // 设置容器模式类
        container.className = 'wb-entries-list ' +
            (this.isMultiSelectMode ? 'wb-multiselect-mode' : 'wb-normal-mode');

        if (filteredEntries.length === 0) {
            container.style.display = 'none';
            if (emptyState) {
                emptyState.style.display = 'block';
                // 区分搜索无结果和真正的空状态
                if (searchTerm) {
                    emptyState.innerHTML = `
                        <div class="wb-empty-icon">🔍</div>
                        <p>未找到匹配"${searchTerm}"的条目</p>
                        <button class="wb-empty-btn" onclick="document.getElementById('wb-search').value=''; WorldBookV2.renderEntries();">清除搜索</button>
                    `;
                } else {
                    emptyState.innerHTML = `
                        <div class="wb-empty-icon">📖</div>
                        <p>暂无条目</p>
                        <button class="wb-empty-btn" onclick="WorldBookV2.addEntry()">创建第一个条目</button>
                    `;
                }
            }
            if (modeBar) modeBar.style.display = 'none';
        } else {
            container.style.display = 'block';
            if (emptyState) emptyState.style.display = 'none';
            if (modeBar) modeBar.style.display = 'flex';

            filteredEntries.forEach(entry => {
                const item = document.createElement('div');
                const isSelected = this.selectedEntryIds.has(entry.id);
                item.className = 'wb-entry-item wb-swipeable' +
                    (entry.enabled === false ? ' disabled' : '') +
                    (isSelected ? ' selected' : '');

                const keys = entry.keys.slice(0, 2).join(', ');
                const content = entry.content.substring(0, 80) + (entry.content.length > 80 ? '...' : '');

                // 安全地创建DOM结构，避免XSS攻击
                const entryContent = document.createElement('div');
                entryContent.className = 'wb-entry-content';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'wb-entry-checkbox';
                checkbox.checked = isSelected;
                checkbox.dataset.entryId = entry.id; // 安全的设置data属性
                checkbox.style.marginRight = '10px';
                
                const entryMain = document.createElement('div');
                entryMain.className = 'wb-entry-main';
                entryMain.style.flex = '1';
                
                const entryHeader = document.createElement('div');
                entryHeader.className = 'wb-entry-header';
                
                const entryTitle = document.createElement('div');
                entryTitle.className = 'wb-entry-title';
                entryTitle.textContent = entry.name || '未命名条目'; // 安全设置文本
                
                const entryBadge = document.createElement('div');
                entryBadge.className = 'wb-entry-badge';
                entryBadge.textContent = (entry.constant ? '常驻' : '触发') + 
                    (entry.enabled === false ? ' · 已禁用' : '');
                
                const entryPreview = document.createElement('div');
                entryPreview.className = 'wb-entry-preview';
                entryPreview.textContent = (keys ? '🔑 ' + keys + ' ' : '') + content; // 安全设置文本
                
                const swipeActions = document.createElement('div');
                swipeActions.className = 'wb-swipe-actions';
                
                const editBtn = document.createElement('button');
                editBtn.className = 'wb-swipe-edit';
                editBtn.textContent = '编辑';
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'wb-swipe-delete';
                deleteBtn.textContent = '删除';
                
                // 组装DOM结构
                entryHeader.appendChild(entryTitle);
                entryHeader.appendChild(entryBadge);
                entryMain.appendChild(entryHeader);
                entryMain.appendChild(entryPreview);
                entryContent.appendChild(checkbox);
                entryContent.appendChild(entryMain);
                swipeActions.appendChild(editBtn);
                swipeActions.appendChild(deleteBtn);
                item.appendChild(entryContent);
                item.appendChild(swipeActions);

                // 绑定事件 - 直接使用已创建的DOM元素

                // 修复勾选框事件
                    checkbox.addEventListener('change', (e) => {
                        e.stopPropagation();
                        
                        // 如果在普通模式下点击勾选框，自动切换到多选模式
                        if (!this.isMultiSelectMode) {
                            this.toggleMode();
                        }
                        
                        if (e.target.checked) {
                            this.selectedEntryIds.add(entry.id);
                        } else {
                            this.selectedEntryIds.delete(entry.id);
                        }
                        this.updateModeBar();

                        // 更新条目样式
                        if (e.target.checked) {
                            item.classList.add('selected');
                        } else {
                            item.classList.remove('selected');
                        }
                    });

                entryMain.addEventListener('click', () => {
                        if (!this.isMultiSelectMode) {
                            this.editEntry(entry);
                        } else {
                            this.toggleEntrySelection(entry.id);
                        }
                    });

                    editBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.editEntry(entry);
                    });

                    deleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.quickDeleteEntry(entry.id);
                    });

                // 只在普通模式下添加滑动手势
                if (!this.isMultiSelectMode) {
                    this.addSimpleSwipe(item);
                }

                container.appendChild(item);
            });

            this.updateModeBar();
        }
    },

    // 展开内容编辑
    expandContent() {
        const content = document.getElementById('entry-content').value;
        document.getElementById('expand-content').value = content;
        document.getElementById('wb-content-expand').style.display = 'flex';
    },

    // 关闭展开内容
    closeExpandContent() {
        document.getElementById('wb-content-expand').style.display = 'none';
    },

    // 保存展开内容
    saveExpandContent() {
        const content = document.getElementById('expand-content').value;
        document.getElementById('entry-content').value = content;
        this.updatePreview();
        this.closeExpandContent();
    },

    // 切换绑定类型
    toggleBindType() {
        const characterRadio = document.getElementById('entry-bind-character');
        const container = document.getElementById('character-select-container');

        if (characterRadio && characterRadio.checked) {
            container.style.display = 'block';
            this.updateCharacterList();
        } else {
            container.style.display = 'none';
            // 清空选择
            if (this.currentEntry) {
                this.currentEntry.characters = [];
            }
            const exclude = document.getElementById('entry-exclude-mode');
            if (exclude) exclude.checked = false;
        }
    },

    // 保留旧方法名兼容
    toggleCharacterBind() {
        this.toggleBindType();
    },

    // 导入条目
    importEntry() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                if (data.name) document.getElementById('entry-name').value = data.name;
                if (data.id) document.getElementById('entry-id').value = data.id;
                if (data.keys) document.getElementById('entry-keys').value = data.keys.join(', ');
                if (data.content) document.getElementById('entry-content').value = data.content;
                alert('条目导入成功！');
            } catch (err) {
                alert('导入失败：' + err.message);
            }
        };
        input.click();
    },

    // 导出条目
    exportEntry() {
        if (!this.currentEntry) return;
        const blob = new Blob([JSON.stringify(this.currentEntry, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `entry_${this.currentEntry.name || 'unnamed'}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },
    
    // 添加新条目
    addEntry() {
        if (!this.currentBook) {
            alert('请先选择一个世界书！');
            return;
        }
        
        this.currentEntry = {
            id: `entry_${Date.now()}`,
            bookId: this.currentBook.id,
            name: '',
            keys: [],
            secondaryKeys: [],
            content: '',
            order: 100,
            depth: 4,
            logic: 'AND_ANY',
            selective: false,
            selectiveLogic: '',
            constant: false,
            probability: 100,
            position: 'after_char',
            disableRecursion: false,
            scanDepth: false,
            recursionDepth: 2,
            bindType: 'inherit',
            characters: [],
            excludeMode: false,
            enabled: true,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        this.openPanel();
    },
    
    // 编辑条目
    editEntry(entry) {
        this.currentEntry = { ...entry };
        this.openPanel();
    },
    
    // 打开编辑面板
    openPanel() {
        const panel = document.getElementById('wb-entry-panel');
        if (!panel || !this.currentEntry) return;

        panel.classList.add('open');

        document.getElementById('entry-name').value = this.currentEntry.name || '';
        document.getElementById('entry-id').value = this.currentEntry.id || '';
        document.getElementById('entry-keys').value = this.currentEntry.keys.join(', ');
        document.getElementById('entry-secondary-keys').value = (this.currentEntry.secondaryKeys || []).join(', ');
        document.getElementById('entry-content').value = this.currentEntry.content || '';
        this.updatePreview();
        document.getElementById('entry-order').value = this.currentEntry.order || 100;
        document.getElementById('entry-depth').value = this.currentEntry.depth || 4;
        document.getElementById('entry-logic').value = this.currentEntry.logic || 'AND_ANY';
        document.getElementById('entry-selective').checked = this.currentEntry.selective || false;
        document.getElementById('entry-constant').checked = this.currentEntry.constant || false;
        document.getElementById('entry-probability').value = this.currentEntry.probability ?? 100;
        document.getElementById('prob-value').textContent = (this.currentEntry.probability ?? 100) + '%';
        document.getElementById('entry-position').value = this.currentEntry.position || 'after_char';
        document.getElementById('entry-disable-recursion').checked = this.currentEntry.disableRecursion || false;
        document.getElementById('entry-scan-depth').checked = this.currentEntry.scanDepth || false;
        document.getElementById('entry-recursion-depth').value = this.currentEntry.recursionDepth || 2;

        // 动态生成角色列表
        this.updateCharacterList();

        // 加载绑定设置
        const inheritRadio = document.getElementById('entry-bind-inherit');
        const globalRadio = document.getElementById('entry-bind-global');
        const characterRadio = document.getElementById('entry-bind-character');
        const charContainer = document.getElementById('character-select-container');

        // 确定绑定类型
        let bindType = this.currentEntry.bindType;
        if (!bindType) {
            // 兼容旧数据
            if (Array.isArray(this.currentEntry.characters) && this.currentEntry.characters.length > 0) {
                bindType = 'character';
            } else if (this.currentEntry.character) {
                bindType = 'character';
                this.currentEntry.characters = [this.currentEntry.character];
            } else {
                bindType = 'inherit';
            }
        }

        // 设置单选按钮
        if (bindType === 'character') {
            if (characterRadio) characterRadio.checked = true;
            if (globalRadio) globalRadio.checked = false;
            if (inheritRadio) inheritRadio.checked = false;
            if (charContainer) charContainer.style.display = 'block';

            // 已在updateCharacterList中处理选中状态
            document.getElementById('entry-exclude-mode').checked = this.currentEntry.excludeMode || false;
        } else if (bindType === 'global') {
            if (globalRadio) globalRadio.checked = true;
            if (characterRadio) characterRadio.checked = false;
            if (inheritRadio) inheritRadio.checked = false;
            if (charContainer) charContainer.style.display = 'none';
        } else {
            // 默认继承
            if (inheritRadio) inheritRadio.checked = true;
            if (globalRadio) globalRadio.checked = false;
            if (characterRadio) characterRadio.checked = false;
            if (charContainer) charContainer.style.display = 'none';
        }

        const probSlider = document.getElementById('entry-probability');
        if (probSlider) {
            probSlider.oninput = (e) => {
                document.getElementById('prob-value').textContent = e.target.value + '%';
            };
        }
    },
    
    // 关闭编辑面板
    closePanel() {
        const panel = document.getElementById('wb-entry-panel');
        if (panel) {
            panel.classList.remove('open');
        }
        this.currentEntry = null;
    },
    
    // 保存条目
    saveEntry() {
        if (!this.currentEntry) return;
        
        // 从表单获取值
        this.currentEntry.name = document.getElementById('entry-name').value;
        const newId = document.getElementById('entry-id').value.trim();
        if (newId) this.currentEntry.id = newId;
        this.currentEntry.keys = document.getElementById('entry-keys').value
            .split(',')
            .map(k => k.trim())
            .filter(k => k);
        this.currentEntry.secondaryKeys = document.getElementById('entry-secondary-keys').value
            .split(',')
            .map(k => k.trim())
            .filter(k => k);
        this.currentEntry.content = document.getElementById('entry-content').value;
        this.currentEntry.order = parseInt(document.getElementById('entry-order').value) || 100;
        this.currentEntry.depth = parseInt(document.getElementById('entry-depth').value) || 4;
        this.currentEntry.logic = document.getElementById('entry-logic').value;
        this.currentEntry.selective = document.getElementById('entry-selective').checked;
        this.currentEntry.constant = document.getElementById('entry-constant').checked;
        this.currentEntry.probability = parseInt(document.getElementById('entry-probability').value);
        this.currentEntry.position = document.getElementById('entry-position').value;
        this.currentEntry.disableRecursion = document.getElementById('entry-disable-recursion').checked;
        this.currentEntry.scanDepth = document.getElementById('entry-scan-depth').checked;
        this.currentEntry.recursionDepth = parseInt(document.getElementById('entry-recursion-depth').value);
        // 保存绑定类型
        const bindType = document.querySelector('input[name="entry-bind-type"]:checked')?.value || 'inherit';
        this.currentEntry.bindType = bindType;

        // 如果是角色绑定，从当前UI重建字符列表，避免隐藏字符绑定持续存在
        if (bindType === 'character') {
            const selectedChars = Array.from(document.querySelectorAll('input[name="entry-characters"]:checked'))
                .map(cb => cb.value);
            // 只保存实际选中的角色，清除所有过期的字符ID
            this.currentEntry.characters = selectedChars;
            this.currentEntry.excludeMode = document.getElementById('entry-exclude-mode').checked;
        } else {
            // 完全清理字符绑定相关字段
            this.currentEntry.characters = [];
            delete this.currentEntry.excludeMode;
        }

        // 清理旧的character字段
        delete this.currentEntry.character;
        this.currentEntry.updatedAt = Date.now();
        
        // 保存到列表
        const existingIndex = this.entries.findIndex(e => e.id === this.currentEntry.id);
        if (existingIndex >= 0) {
            this.entries[existingIndex] = this.currentEntry;
        } else {
            this.entries.push(this.currentEntry);
        }
        
        this.saveData();
        this.renderEntries();
        this.closePanel();
        
        alert('条目已保存！');
    },

    // 删除条目
    deleteEntry() {
        if (!this.currentEntry) return;
        
        if (confirm('确定要删除这个条目吗？')) {
            this.entries = this.entries.filter(e => e.id !== this.currentEntry.id);
            this.saveData();
            this.renderEntries();
            this.closePanel();
        }
    },
    
    // 更新内容预览
    updatePreview() {
        const content = document.getElementById('entry-content').value;
        const preview = document.getElementById('content-preview');
        if (!preview) return;
        
        if (!content) {
            preview.textContent = '在上方输入内容...';
            return;
        }
        
        // 调用已有的变量替换功能
        try {
            const processed = window.replaceVariables ? window.replaceVariables(content) : content;
            // 安全地处理换行符，避免HTML注入
            preview.textContent = processed;
            preview.style.whiteSpace = 'pre-wrap'; // 保持换行格式
        } catch (e) {
            preview.textContent = content;
        }
    },


    // 更新角色下拉列表
    updateCharacterList() {
        const dropdown = document.getElementById('character-dropdown');
        const container = document.getElementById('selected-characters-container');
        if (!dropdown || !container) return;

        // 从状态管理获取角色列表
        const state = StateManager.get();
        const characters = [];

        // 获取主AI角色
        if (state.ai && state.ai.name) {
            characters.push({ 
                id: 'default', 
                name: state.ai.name 
            });
        }

        // 获取其他预设角色
        if (state.chats) {
            Object.keys(state.chats).forEach(chatId => {
                const chat = state.chats[chatId];
                if (chat.settings && chat.settings.aiPersona) {
                    const personaName = chat.settings.aiPersona.split('。')[0]
                        .replace(/你是AI伴侣'|你是|'/g, '')
                        .trim();
                    if (personaName && !characters.find(c => c.name === personaName)) {
                        characters.push({
                            id: chatId,
                            name: personaName
                        });
                    }
                }
            });
        }

        // 如果没有找到任何角色，使用默认值
        if (characters.length === 0) {
            characters.push({ id: 'default', name: '默认AI' });
        }

        // 更新下拉框
        dropdown.innerHTML = '<option value="">选择要绑定的角色...</option>';
        characters.forEach(char => {
            const isSelected = this.currentEntry?.characters?.includes(char.id);
            if (!isSelected) {
                const option = document.createElement('option');
                option.value = char.id;
                option.textContent = char.name;
                option.dataset.name = char.name;
                dropdown.appendChild(option);
            }
        });

        // 显示已选择的角色
        this.updateSelectedCharacters();
    },

    // 更新已选择的角色显示
    updateSelectedCharacters() {
        const container = document.getElementById('selected-characters-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!this.currentEntry?.characters || this.currentEntry.characters.length === 0) {
            container.innerHTML = '<span class="character-empty-hint">尚未选择角色</span>';
            return;
        }
        
        // 获取角色信息
        const state = StateManager.get();
        const allCharacters = [];
        
        if (state.ai && state.ai.name) {
            allCharacters.push({ id: 'default', name: state.ai.name });
        }
        
        if (state.chats) {
            Object.keys(state.chats).forEach(chatId => {
                const chat = state.chats[chatId];
                if (chat.settings && chat.settings.aiPersona) {
                    const personaName = chat.settings.aiPersona.split('。')[0]
                        .replace(/你是AI伴侣'|你是|'/g, '')
                        .trim();
                    if (personaName) {
                        allCharacters.push({ id: chatId, name: personaName });
                    }
                }
            });
        }
        
        // 显示标签
        this.currentEntry.characters.forEach(charId => {
            const charInfo = allCharacters.find(c => c.id === charId);
            if (charInfo) {
                const tag = document.createElement('div');
                tag.className = 'character-tag';
                
                const nameSpan = document.createElement('span');
                nameSpan.textContent = charInfo.name; // 安全设置文本
                
                const removeSpan = document.createElement('span');
                removeSpan.className = 'character-tag-remove';
                removeSpan.textContent = '×';
                removeSpan.style.cursor = 'pointer';
                // 安全的事件绑定，避免使用onclick属性
                removeSpan.addEventListener('click', () => {
                    this.removeCharacter(charId);
                });
                
                tag.appendChild(nameSpan);
                tag.appendChild(removeSpan);
                container.appendChild(tag);
            }
        });
    },

    // 添加选中的角色
    addSelectedCharacter() {
        const dropdown = document.getElementById('character-dropdown');
        if (!dropdown || !dropdown.value) return;
        
        if (!this.currentEntry.characters) {
            this.currentEntry.characters = [];
        }
        
        const charId = dropdown.value;
        if (!this.currentEntry.characters.includes(charId)) {
            this.currentEntry.characters.push(charId);
            this.updateCharacterList();
            dropdown.value = '';
        }
    },

    // 移除角色
    removeCharacter(charId) {
        if (!this.currentEntry?.characters) return;
        
        this.currentEntry.characters = this.currentEntry.characters.filter(id => id !== charId);
        this.updateCharacterList();
    },
    // 测试条目
    testEntry() {
        if (!this.currentEntry) return;

        const dialog = document.getElementById('wb-test-dialog');
        if (dialog) {
            dialog.style.display = 'flex';
        }
    },
    
    // 运行测试
    runTest() {
        const testText = document.getElementById('test-text').value;
        if (!testText || !this.currentEntry) return;
        
        const results = document.getElementById('test-results');
        const matches = document.getElementById('test-matches');
        
        results.style.display = 'block';
        matches.innerHTML = '';
        
        // 测试关键词匹配
        let isMatch = false;
        const matchedKeys = [];
        
        for (const key of this.currentEntry.keys) {
            if (this.testKey(key, testText, this.currentEntry)) {
                matchedKeys.push(key);
                isMatch = true;
            }
        }
        
        if (this.currentEntry.constant) {
            isMatch = true;
            matchedKeys.push('(常驻条目)');
        }
        
        // 显示结果
        const matchDiv = document.createElement('div');
        matchDiv.className = 'test-match' + (isMatch ? ' active' : '');
        
        if (isMatch) {
            // 安全地创建测试结果
            const header = document.createElement('strong');
            header.textContent = '✅ 条目已激活';
            
            const keywordsText = document.createElement('div');
            keywordsText.textContent = '匹配的关键词: ' + matchedKeys.join(', ');
            
            const contentText = document.createElement('div');
            contentText.textContent = `将注入内容 (${this.currentEntry.content.length} 字符)`;
            
            matchDiv.appendChild(header);
            matchDiv.appendChild(keywordsText);
            matchDiv.appendChild(contentText);
        } else {
            const header = document.createElement('strong');
            header.textContent = '❌ 条目未激活';
            
            const noMatchText = document.createElement('div');
            noMatchText.textContent = '没有匹配的关键词';
            
            matchDiv.appendChild(header);
            matchDiv.appendChild(noMatchText);
        }
        
        matches.appendChild(matchDiv);
    },
    
    // 测试单个关键词 - 增强版
    testKey(key, text, entry) {
        // 获取匹配设置（优先使用条目设置，其次全局设置）
        const globalSettings = this.globalSettings || {};
        const caseSensitive = entry?.caseSensitive ?? globalSettings.caseSensitive ?? false;
        const matchWholeWords = entry?.matchWholeWords ?? globalSettings.matchWholeWords ?? false;
        
        // 检查是否是正则表达式
        if (key.startsWith('/') && key.lastIndexOf('/') > 0) {
            try {
                const lastSlash = key.lastIndexOf('/');
                const pattern = key.substring(1, lastSlash);
                let flags = key.substring(lastSlash + 1);
                
                // 如果全局设置不区分大小写，强制添加i标志
                if (!caseSensitive && !flags.includes('i')) {
                    flags += 'i';
                }
                
                const regex = new RegExp(pattern, flags);
                return regex.test(text);
            } catch (e) {
                console.warn(`正则表达式错误: ${key}`, e);
                return false;
            }
        }
        
        // 普通文本匹配
        let searchKey = key;
        let searchText = text;
        
        // 处理大小写
        if (!caseSensitive) {
            searchKey = key.toLowerCase();
            searchText = text.toLowerCase();
        }
        
        // 全词匹配
        if (matchWholeWords) {
            // 构建全词匹配的正则表达式
            // 对于中文等没有词边界的语言，直接使用包含匹配
            const hasChineseOrJapanese = /[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff]/.test(searchKey);
            
            if (hasChineseOrJapanese) {
                // 中文/日文直接包含匹配
                return searchText.includes(searchKey);
            } else {
                // 英文等使用词边界
                const wordRegex = new RegExp(`\\b${this.escapeRegex(searchKey)}\\b`, caseSensitive ? 'g' : 'gi');
                return wordRegex.test(text);
            }
        } else {
            // 简单包含匹配
            return searchText.includes(searchKey);
        }
    },

    // 辅助方法：转义正则特殊字符
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },
    
    // 关闭测试对话框
    closeTestDialog() {
        const dialog = document.getElementById('wb-test-dialog');
        if (dialog) {
            dialog.style.display = 'none';
        }
    },
    
    // 创建新世界书
    createNewBook() {
        const name = prompt('请输入世界书名称：');
        if (!name) return;
        
        const book = {
            id: `book_${Date.now()}`,
            name: name,
            description: '',
            scope: 'global',
            character: null,
            scanDepth: 2,
            tokenBudget: 2048,
            recursive: true,
            caseSensitive: false,
            matchWholeWords: false,
            createdAt: Date.now()
        };
        
        this.books.push(book);
        this.currentBook = book;
        this.saveData();
        this.render();
    },
    
    // 编辑世界书设置
    editBookSettings() {
        if (!this.currentBook) {
            alert('请先选择一个世界书！');
            return;
        }

        const dialog = document.getElementById('wb-book-settings');
        if (!dialog) return;

        dialog.style.display = 'flex';

        document.getElementById('book-name').value = this.currentBook.name;
        document.getElementById('book-description').value = this.currentBook.description || '';
        document.getElementById('book-scope').value = this.currentBook.scope || 'global';
        this.toggleCharacterSelection();

        // 加载扫描深度和Token预算
        const scanDepthInput = document.getElementById('book-scan-depth');
        if (scanDepthInput) {
            scanDepthInput.value = this.currentBook.scanDepth || 2;
        }

        const tokenBudgetInput = document.getElementById('book-token-budget');
        if (tokenBudgetInput) {
            tokenBudgetInput.value = this.currentBook.tokenBudget || 2048;
        }
    },

    // 保存世界书设置
    saveBookSettings() {
        if (!this.currentBook) return;

        this.currentBook.name = document.getElementById('book-name').value;
        this.currentBook.description = document.getElementById('book-description').value;
        this.currentBook.scope = document.getElementById('book-scope').value;

        // 保存扫描深度设置
        const scanDepthInput = document.getElementById('book-scan-depth');
        if (scanDepthInput) {
            this.currentBook.scanDepth = parseInt(scanDepthInput.value) || 2;
        }

        // 保存Token预算设置
        const tokenBudgetInput = document.getElementById('book-token-budget');
        if (tokenBudgetInput) {
            this.currentBook.tokenBudget = parseInt(tokenBudgetInput.value) || 2048;
        }

        this.saveData();
        this.render();
        this.closeBookSettings();

        alert('设置已保存！');
    },
    
    // 关闭设置对话框
    closeBookSettings() {
        const dialog = document.getElementById('wb-book-settings');
        if (dialog) {
            dialog.style.display = 'none';
        }
    },

    // 切换角色选择区域显示
    toggleCharacterSelection() {
        const scopeSelect = document.getElementById('book-scope');
        const charSection = document.getElementById('book-character-selection');
        if (!scopeSelect || !charSection) return;

        if (scopeSelect.value === 'character') {
            charSection.style.display = 'block';
            // TODO: populate book-characters-list when multi-character support is implemented
        } else {
            charSection.style.display = 'none';
        }
    },

    // 导入世界书
    importBook() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (!data.book || !data.entries) {
                        alert('文件格式不正确。');
                        return;
                    }

                    const bookId = data.book.id || `import_${Date.now()}`;
                    const newBook = { ...data.book, id: bookId };
                    const newEntries = (data.entries || []).map(entry => ({
                        ...entry,
                        id: entry.id || `import_entry_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                        bookId
                    }));

                    this.books.push(newBook);
                    this.entries.push(...newEntries);
                    this.currentBook = newBook;
                    this.saveData();
                    this.render();
                    alert('世界书导入成功！');
                } catch (err) {
                    console.error(err);
                    alert('导入世界书失败：' + err.message);
                }
            };

            reader.readAsText(file);
        });

        input.click();
    },

    // 删除世界书
    deleteBook() {
        if (!this.currentBook) return;
        
        if (confirm(`确定要删除世界书"${this.currentBook.name}"及其所有条目吗？`)) {
            // 删除相关条目
            this.entries = this.entries.filter(e => e.bookId !== this.currentBook.id);
            
            // 删除世界书
            this.books = this.books.filter(b => b.id !== this.currentBook.id);
            
            this.currentBook = this.books[0] || null;
            this.saveData();
            this.render();
            this.closeBookSettings();
        }
    },
    
    // 导出世界书
    exportBook() {
        if (!this.currentBook) return;
        
        const bookEntries = this.entries.filter(e => e.bookId === this.currentBook.id);
        const exportData = {
            book: this.currentBook,
            entries: bookEntries,
            version: '2.0',
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `worldbook_${this.currentBook.name}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },
    
    // 绑定事件
    bindEvents() {
        // 世界书选择
        const bookSelector = document.getElementById('wb-current-book');
        if (bookSelector) {
            bookSelector.addEventListener('change', (e) => {
                const bookId = e.target.value;
                this.currentBook = this.books.find(b => b.id === bookId) || null;
                // 清空之前的选择，避免跨世界书操作
                this.selectedEntryIds.clear();
                this.render();
            });
        }

        // 搜索
        const searchInput = document.getElementById('wb-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.renderEntries();
            });
        }

        // 概率滑块
        const probSlider = document.getElementById('entry-probability');
        if (probSlider) {
            probSlider.addEventListener('input', (e) => {
                document.getElementById('prob-value').textContent = e.target.value + '%';
            });
        }

        // 已移除右滑返回功能，避免与条目操作冲突
    },

    // ========== 批量操作功能 ==========

    // 切换单个条目选中状态
    toggleEntrySelection(entryId) {
        if (this.selectedEntryIds.has(entryId)) {
            this.selectedEntryIds.delete(entryId);
        } else {
            this.selectedEntryIds.add(entryId);
        }
        this.renderEntries();
    },

    // 全选/取消全选
    toggleSelectAll() {
        const bookEntries = this.entries.filter(e => e.bookId === this.currentBook.id);
        const allSelected = bookEntries.every(e => this.selectedEntryIds.has(e.id));

        if (allSelected) {
            // 取消全选
            this.selectedEntryIds.clear();
        } else {
            // 全选当前世界书的所有条目
            bookEntries.forEach(e => this.selectedEntryIds.add(e.id));
        }

        // 更新全选checkbox状态
        const selectAllCheckbox = document.getElementById('wb-select-all');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = !allSelected;
        }

        this.renderEntries();
    },

    // 批量启用/禁用
    batchEnable(enable) {
        if (this.selectedEntryIds.size === 0) {
            alert('请先选择要操作的条目');
            return;
        }

        const count = this.selectedEntryIds.size;

        // 更新选中条目的启用状态
        this.entries = this.entries.map(entry => {
            if (this.selectedEntryIds.has(entry.id)) {
                entry.enabled = enable;
                entry.updatedAt = Date.now();
            }
            return entry;
        });

        this.saveData();
        this.selectedEntryIds.clear();
        this.renderEntries();

        alert(`已${enable ? '启用' : '禁用'} ${count} 个条目`);
    },

    // 批量删除
    batchDelete() {
        if (this.selectedEntryIds.size === 0) {
            alert('请先选择要删除的条目');
            return;
        }

        if (!confirm(`确定要删除选中的 ${this.selectedEntryIds.size} 个条目吗？`)) {
            return;
        }

        // 删除选中的条目
        this.entries = this.entries.filter(entry => !this.selectedEntryIds.has(entry.id));

        this.saveData();
        this.selectedEntryIds.clear();
        this.renderEntries();

        alert('已删除选中的条目');
    },

    // 切换模式
    toggleMode() {
        this.isMultiSelectMode = !this.isMultiSelectMode;

        const modeBtn = document.getElementById('wb-toggle-mode');
        const modeInfo = document.getElementById('wb-mode-info');
        const batchBar = document.getElementById('wb-batch-bar');

        if (this.isMultiSelectMode) {
            modeBtn.classList.add('active');
            modeBtn.querySelector('.mode-text').textContent = '退出';
            modeInfo.style.display = 'flex';
            if (this.selectedEntryIds.size > 0) {
                batchBar.style.display = 'block';
            }
        } else {
            modeBtn.classList.remove('active');
            modeBtn.querySelector('.mode-text').textContent = '多选';
            modeInfo.style.display = 'none';
            batchBar.style.display = 'none';
            this.selectedEntryIds.clear();
        }

        this.renderEntries();
    },

    // 退出多选模式
    exitMultiSelect() {
        this.isMultiSelectMode = false;
        this.selectedEntryIds.clear();
        this.toggleMode();
    },

    // 更新模式栏显示
    updateModeBar() {
        const selectedCount = document.getElementById('wb-selected-count');
        const batchBar = document.getElementById('wb-batch-bar');

        if (selectedCount) {
            selectedCount.textContent = `已选: ${this.selectedEntryIds.size}`;
        }

        if (this.isMultiSelectMode && this.selectedEntryIds.size > 0) {
            batchBar.style.display = 'block';
        } else {
            batchBar.style.display = 'none';
        }
    },

    // 简化的滑动手势（只处理左滑）
    addSimpleSwipe(element) {
        let startX = 0;
        let currentX = 0;
        let isMoving = false;

        const content = element.querySelector('.wb-entry-content');
        const actions = element.querySelector('.wb-swipe-actions');

        const reset = () => {
            content.style.transform = '';
            actions.classList.remove('visible');
            actions.style.opacity = '';
        };

        const show = () => {
            content.style.transform = 'translateX(-100px)';
            actions.classList.add('visible');
            actions.style.opacity = '';
        };

        // 重置其他条目
        const resetOthers = () => {
            document.querySelectorAll('.wb-entry-item').forEach(item => {
                if (item !== element) {
                    const c = item.querySelector('.wb-entry-content');
                    const a = item.querySelector('.wb-swipe-actions');
                    if (c) c.style.transform = '';
                    if (a) {
                        a.classList.remove('visible');
                        a.style.opacity = '';
                    }
                }
            });
        };

        content.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            currentX = startX;
            isMoving = false;
        }, {passive: true});

        content.addEventListener('touchmove', (e) => {
            currentX = e.touches[0].clientX;
            const diff = startX - currentX;
            isMoving = true;

            if (diff > 10) {
                resetOthers();
                const translate = Math.min(diff, 100);
                content.style.transform = `translateX(-${translate}px)`;
                actions.classList.add('visible');
                actions.style.opacity = translate / 100;
            }
        }, {passive: true});

        content.addEventListener('touchend', () => {
            const diff = startX - currentX;

            if (isMoving && diff > 50) {
                show();
            } else {
                reset();
            }
            isMoving = false;
        }, {passive: true});

        // 点击其他地方关闭 - 使用命名函数以便后续可以移除
        const handleDocumentClick = (e) => {
            if (!element.contains(e.target)) {
                reset();
            }
        };
        document.addEventListener('click', handleDocumentClick);
        
        // 保存清理函数，防止内存泄漏
        element._cleanupSwipeListener = () => {
            document.removeEventListener('click', handleDocumentClick);
        };
    },


    // 快速删除条目
    quickDeleteEntry(entryId) {
        if (confirm('确定删除这个条目吗？')) {
            this.entries = this.entries.filter(e => e.id !== entryId);
            this.saveData();
            this.renderEntries();
        }
    },

    // 编辑玩家名称
    editPlayerName() {
        const state = StateManager.get();
        const newName = prompt('请输入你的名字：', state.player.name);
        if (newName && newName.trim()) {
            state.player.name = newName.trim();
            StateManager.set(state);
            Database.saveWorldState();
            const display = document.getElementById('player-name-display');
            if (display) {
                display.textContent = newName.trim();
            }
        }
    },

    // 获取激活的世界书条目（为AI集成准备）- 增强版
    getActiveEntries(text) {
        if (!this.currentBook) return [];

        const activeEntries = [];
        const processedIds = new Set(); // 避免重复添加
        
        // 获取当前世界书的所有启用条目
        const bookEntries = this.entries.filter(e =>
            e.bookId === this.currentBook.id && e.enabled !== false
        );

        // 第一轮：直接匹配
        bookEntries.forEach(entry => {
            // 常驻条目总是激活
            if (entry.constant) {
                activeEntries.push(entry);
                processedIds.add(entry.id);
                return;
            }

            // 检查主关键词匹配
            let matched = false;
            for (const key of entry.keys || []) {
                if (this.testKey(key, text, entry)) {
                    matched = true;
                    break;
                }
            }
            
            // 检查辅助关键词（根据逻辑设置）
            if (!matched && entry.secondaryKeys && entry.secondaryKeys.length > 0) {
                const logic = entry.logic || 'AND_ANY';
                const secondaryMatches = entry.secondaryKeys.map(key => 
                    this.testKey(key, text, entry)
                );
                
                switch (logic) {
                    case 'AND_ANY':
                        matched = secondaryMatches.some(m => m);
                        break;
                    case 'AND_ALL':
                        matched = secondaryMatches.every(m => m);
                        break;
                    case 'NOT_ANY':
                        matched = !secondaryMatches.some(m => m);
                        break;
                    case 'NOT_ALL':
                        matched = !secondaryMatches.every(m => m);
                        break;
                }
            }
            
            if (matched && !processedIds.has(entry.id)) {
                // 检查概率
                const probability = entry.probability ?? 100;
                if (Math.random() * 100 <= probability) {
                    activeEntries.push(entry);
                    processedIds.add(entry.id);
                }
            }
        });

        // 递归扫描（如果启用）
        const globalSettings = this.globalSettings || {};
        if (globalSettings.recursiveScan && globalSettings.maxRecursion > 0) {
            let recursionStep = 0;
            let newlyAdded = [...activeEntries];
            
            while (recursionStep < globalSettings.maxRecursion && newlyAdded.length > 0) {
                recursionStep++;
                const recursionCandidates = [];
                
                // 用已激活条目的内容作为新的扫描文本
                const recursionText = newlyAdded.map(e => e.content).join('\n');
                
                bookEntries.forEach(entry => {
                    // 跳过已处理的和禁用递归的
                    if (processedIds.has(entry.id) || entry.disableRecursion) {
                        return;
                    }
                    
                    // 检查是否被递归文本触发
                    for (const key of entry.keys || []) {
                        if (this.testKey(key, recursionText, entry)) {
                            const probability = entry.probability ?? 100;
                            if (Math.random() * 100 <= probability) {
                                recursionCandidates.push(entry);
                                processedIds.add(entry.id);
                            }
                            break;
                        }
                    }
                });
                
                newlyAdded = recursionCandidates;
                activeEntries.push(...recursionCandidates);
            }
        }

        // 按优先级排序（数字越大越优先选中，与SillyTavern一致）
        // 注意：这是挑选顺序，不是最终插入位置
        activeEntries.sort((a, b) => (b.order || 0) - (a.order || 0));

        return activeEntries;
    },

    // 构建世界书上下文（为AI注入准备）
    buildWorldBookContext(text) {
        const entries = this.getActiveEntries(text);
        let context = '';

        entries.forEach(entry => {
            // 处理变量替换
            let content = entry.content;
            if (window.replaceVariables) {
                content = window.replaceVariables(content);
            }
            context += content + '\n\n';
        });

        return context.trim();
    }
};

// 暴露到全局
window.WorldBookV2 = WorldBookV2;
