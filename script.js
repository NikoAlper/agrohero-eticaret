document.addEventListener("DOMContentLoaded", () => {
    ensureFavicon();
    initFanEngine();
    initYelpaze();
    initProductDetail();
    initListingFilters();
});

function ensureFavicon() {
    const head = document.head;
    if (!head) return;

    const existing = head.querySelector("link[rel~='icon']");
    if (existing) return;

    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    link.href = "img/logo/agrohero-logo-48.png";
    head.appendChild(link);
}

function initYelpaze() {
    const engine = document.querySelector(".yelpaze-engine");
    if (!engine) return;

    const orbit = engine.querySelector(".yelpaze-orbit");
    const centerNode = engine.querySelector(".yelpaze-center");
    const logo = engine.querySelector(".yelpaze-logo");
    const cards = Array.from(engine.querySelectorAll(".yelpaze-card"));
    const panels = Array.from(engine.querySelectorAll(".yelpaze-panel"));
    const backButtons = Array.from(engine.querySelectorAll(".yelpaze-back"));
    const downButton = engine.closest(".yelpaze")?.querySelector(".down-button button");

    const getItemSize = (items, fallback) => {
        const sample = items.find((item) => item.offsetWidth > 0) || items[0];
        if (!sample) return { width: fallback, height: fallback };
        return {
            width: Math.max(sample.offsetWidth, fallback),
            height: Math.max(sample.offsetHeight, fallback)
        };
    };

    const getOrbitBounds = () => {
        if (!orbit) return { size: 420 };
        return {
            size: Math.min(orbit.clientWidth, orbit.clientHeight)
        };
    };

    const getRingPlan = (count, maxRadius, minRadius, itemWidth, gap) => {
        const safeMax = Math.max(minRadius + 10, maxRadius);
        const maxPerRing = Math.max(4, Math.floor((2 * Math.PI * safeMax) / (itemWidth + gap)));

        if (count <= maxPerRing) {
            const radius = Math.max(minRadius, Math.min(safeMax, (itemWidth + gap) * count / (2 * Math.PI)));
            return { outerCount: count, innerCount: 0, outerRadius: radius, innerRadius: null };
        }

        const outerCount = Math.min(maxPerRing, Math.ceil(count * 0.6));
        const innerCount = count - outerCount;
        const outerRadius = Math.max(minRadius + 12, Math.min(safeMax, (itemWidth + gap) * outerCount / (2 * Math.PI)));
        const innerRadius = Math.max(minRadius, Math.min(outerRadius * 0.68, safeMax - itemWidth * 0.6));
        return { outerCount, innerCount, outerRadius, innerRadius };
    };

    const layoutOrbitItems = (items, plan) => {
        if (!items.length) return;
        const startAngle = -90;
        const { outerCount, innerCount, outerRadius, innerRadius } = plan;
        const outerStep = 360 / outerCount;
        items.slice(0, outerCount).forEach((item, index) => {
            const angle = startAngle + outerStep * index;
            item.style.setProperty("--angle", `${angle}deg`);
            item.style.setProperty("--radius", `${Math.round(outerRadius)}px`);
        });

        if (innerCount > 0 && innerRadius) {
            const innerStep = 360 / innerCount;
            items.slice(outerCount).forEach((item, index) => {
                const angle = startAngle + innerStep * index + innerStep / 2;
                item.style.setProperty("--angle", `${angle}deg`);
                item.style.setProperty("--radius", `${Math.round(innerRadius)}px`);
            });
        }
    };

    let cachedLayout = null;
    const applyOrbitLayout = () => {
        if (orbit && centerNode) {
            const cx = centerNode.offsetLeft + centerNode.offsetWidth / 2;
            const cy = centerNode.offsetTop + centerNode.offsetHeight / 2;
            orbit.style.setProperty("--orbit-center-x", `${cx}px`);
            orbit.style.setProperty("--orbit-center-y", `${cy}px`);
        }

        const { size } = getOrbitBounds();
        const centerRadius = centerNode && centerNode.offsetWidth ? centerNode.offsetWidth * 0.5 : 70;
        const cardSize = getItemSize(cards, 130);
        const gap = Math.max(12, Math.round(size * 0.035));
        const maxRadius = Math.max(140, Math.min(280, size / 2 - cardSize.height / 2 - 16));
        const minRadius = centerRadius + cardSize.height / 2 + 14;

        const requiredRadius = (cardSize.width + gap) / (2 * Math.sin(Math.PI / Math.max(cards.length, 4)));
        const radius = Math.max(minRadius, Math.min(maxRadius, requiredRadius));
        const scale = Math.min(1, maxRadius / requiredRadius);

        engine.style.setProperty("--orbit-scale", scale.toFixed(3));
        engine.style.setProperty("--orbit-scale-hover", Math.min(1.08, scale * 1.03).toFixed(3));

        const cardPlan = { outerCount: cards.length, innerCount: 0, outerRadius: radius, innerRadius: null };
        layoutOrbitItems(cards, cardPlan);

        cachedLayout = { maxRadius, minRadius, gap, outerRadius: cardPlan.outerRadius, innerRadius: cardPlan.outerRadius * 0.7 };

        panels.forEach((panel) => {
            const links = Array.from(panel.querySelectorAll(".yelpaze-link"));
            const linkSize = getItemSize(links, 120);
            const linkMaxRadius = Math.max(120, Math.min(cardPlan.outerRadius * 0.96, maxRadius - 10));
            const linkMinRadius = Math.max(minRadius - 10, centerRadius + linkSize.height / 2 + 10);
            const linkPlan = getRingPlan(links.length, linkMaxRadius, linkMinRadius, linkSize.width, gap);
            layoutOrbitItems(links, linkPlan);
        });
    };

    const resetPanels = () => {
        engine.classList.remove("is-focused");
        cards.forEach((card) => {
            card.classList.remove("active");
            card.setAttribute("aria-expanded", "false");
        });
        panels.forEach((panel) => {
            panel.classList.remove("active");
        });
    };

    const activatePanel = (targetId) => {
        const panelExists = panels.some((panel) => panel.id === targetId);
        if (!panelExists) return;

        engine.classList.add("is-focused");
        cards.forEach((card) => {
            const active = card.dataset.target === targetId;
            card.classList.toggle("active", active);
            card.setAttribute("aria-expanded", active ? "true" : "false");
        });
        panels.forEach((panel) => {
            panel.classList.toggle("active", panel.id === targetId);
        });

        const activePanel = panels.find((panel) => panel.id === targetId);
        if (activePanel) {
            window.requestAnimationFrame(() => {
                const links = Array.from(activePanel.querySelectorAll(".yelpaze-link"));
                const { maxRadius, minRadius, gap, outerRadius, innerRadius } = cachedLayout || {};
                const linkSize = getItemSize(links, 120);
                const linkMaxRadius = maxRadius ? Math.min(maxRadius - 6, outerRadius || maxRadius) : 200;
                const linkMinRadius = minRadius ? Math.max(minRadius - 8, linkSize.height / 2 + 70) : 140;
                const linkPlan = getRingPlan(links.length, linkMaxRadius, linkMinRadius, linkSize.width, gap || 16);
                layoutOrbitItems(links, linkPlan);
            });
        }
    };

    if (logo) {
        logo.classList.add("is-spinning");
        window.setTimeout(() => {
            logo.classList.remove("is-spinning");
        }, 2600);
    }

    window.requestAnimationFrame(applyOrbitLayout);

    let resizeTimer = null;
    window.addEventListener("resize", () => {
        if (resizeTimer) window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
            applyOrbitLayout();
        }, 120);
    });

    cards.forEach((card) => {
        card.addEventListener("click", () => {
            activatePanel(card.dataset.target);
        });
    });

    backButtons.forEach((button) => {
        button.addEventListener("click", () => {
            resetPanels();
        });
    });

    if (downButton) {
        downButton.addEventListener("click", (event) => {
            event.preventDefault();
            const targetSelector = downButton.dataset.target || "#home-sections";
            const target = document.querySelector(targetSelector);
            if (target) {
                target.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        });
    }
}

function initProductDetail() {
    const quantityInput = document.getElementById("quantity") || document.querySelector(".qty-row input");
    const qtyButtons = document.querySelectorAll(".qty-btn");

    if (quantityInput && qtyButtons.length) {
        qtyButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const currentQty = parseInt(quantityInput.value || "1", 10);
                const action = button.getAttribute("data-action") || button.textContent.trim();

                if (action === "plus" || action === "+") {
                    quantityInput.value = currentQty + 1;
                } else if ((action === "minus" || action === "-") && currentQty > 1) {
                    quantityInput.value = currentQty - 1;
                }
            });
        });
    }

    const tabList = document.querySelector(".product-tabs .tab-list");
    const tabPanes = document.querySelectorAll(".product-tabs .tab-pane");

    if (tabList && tabPanes.length) {
        tabList.addEventListener("click", (event) => {
            const tabListItem = event.target.closest("li");
            if (!tabListItem) return;

            const targetTab = tabListItem.getAttribute("data-tab");

            document.querySelectorAll(".tab-list li").forEach((li) => {
                li.classList.remove("active");
            });

            tabListItem.classList.add("active");

            tabPanes.forEach((pane) => {
                pane.classList.remove("active");
            });

            const activePane = document.getElementById(targetTab);
            if (activePane) {
                activePane.classList.add("active");
            }
        });
    }

    const addToCartButton = document.getElementById("addToCart");
    const productName = document.querySelector(".product-info h1");

    if (addToCartButton && quantityInput && productName) {
        addToCartButton.addEventListener("click", () => {
            const quantity = quantityInput.value;
            alert(`${quantity} adet ${productName.innerText} sepete eklendi (Simulasyon).`);
        });
    }
}

function initListingFilters() {
    const filterPanel = document.querySelector(".listing-filters");
    const listingGrid = document.querySelector(".listing-grid");

    if (!filterPanel || !listingGrid) return;

    const cards = Array.from(listingGrid.querySelectorAll(".listing-card"));
    if (!cards.length) return;

    const searchInput = document.getElementById("filter-search");
    const categoryInputs = Array.from(document.querySelectorAll('input[name="category"]'));
    const brandSelect = document.getElementById("filter-brand");
    const modelSelect = document.getElementById("filter-model");
    const priceMinInput = document.getElementById("filter-price-min");
    const priceMaxInput = document.getElementById("filter-price-max");
    const applyButton = document.getElementById("filter-apply");
    const resetButton = document.getElementById("filter-reset");
    const resultCount = document.getElementById("result-count");
    const activeFilters = document.getElementById("active-filters");

    const normalize = (value) => {
        return String(value || "")
            .toLowerCase()
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/ı/g, "i");
    };
    const parseNumber = (value) => {
        if (value === null || value === undefined || value === "") return null;
        const num = Number(String(value).replace(",", "."));
        return Number.isNaN(num) ? null : num;
    };

    const buildState = () => {
        return {
            search: normalize(searchInput ? searchInput.value : ""),
            categories: categoryInputs.filter((input) => input.checked).map((input) => input.value),
            brand: brandSelect ? brandSelect.value : "",
            model: modelSelect ? modelSelect.value : "",
            min: parseNumber(priceMinInput ? priceMinInput.value : ""),
            max: parseNumber(priceMaxInput ? priceMaxInput.value : "")
        };
    };

    const matchesCard = (card, state) => {
        const data = card.dataset;
        const cardCategories = (data.category || "").split(",").map((item) => item.trim()).filter(Boolean);

        if (state.categories.length && !state.categories.some((cat) => cardCategories.includes(cat))) {
            return false;
        }

        if (state.brand && data.brand !== state.brand) return false;
        if (state.model && data.model !== state.model) return false;

        const cardPrice = Number(data.price || 0);
        if (state.min !== null && cardPrice < state.min) return false;
        if (state.max !== null && cardPrice > state.max) return false;

        if (state.search) {
            const hay = normalize(data.search || card.textContent);
            if (!hay.includes(state.search)) return false;
        }

        return true;
    };

    const updateCount = (visible) => {
        if (resultCount) {
            resultCount.textContent = `Toplam ${visible} ilan`;
        }
    };

    const updateActiveFilters = (state) => {
        if (!activeFilters) return;
        activeFilters.innerHTML = "";
        const labels = [];

        if (state.search && searchInput && searchInput.value.trim()) {
            labels.push(`Arama: ${searchInput.value.trim()}`);
        }

        if (state.categories.length) {
            categoryInputs.filter((input) => input.checked).forEach((input) => {
                labels.push(input.parentElement.textContent.trim());
            });
        }

        if (state.brand && brandSelect) {
            const option = brandSelect.options[brandSelect.selectedIndex];
            if (option && option.value) labels.push(option.textContent.trim());
        }

        if (state.model && modelSelect) {
            const option = modelSelect.options[modelSelect.selectedIndex];
            if (option && option.value) labels.push(option.textContent.trim());
        }

        if (state.min !== null || state.max !== null) {
            if (state.min !== null && state.max !== null) {
                labels.push(`Fiyat: ${state.min} - ${state.max}`);
            } else if (state.min !== null) {
                labels.push(`Fiyat: ${state.min}+`);
            } else if (state.max !== null) {
                labels.push(`Fiyat: 0 - ${state.max}`);
            }
        }

        labels.forEach((text) => {
            const span = document.createElement("span");
            span.textContent = text;
            activeFilters.appendChild(span);
        });
    };

    const applyFilters = () => {
        const state = buildState();
        let visible = 0;

        cards.forEach((card) => {
            const show = matchesCard(card, state);
            card.style.display = show ? "" : "none";
            if (show) visible += 1;
        });

        updateCount(visible);
        updateActiveFilters(state);
    };

    const applyUrlFilters = () => {
        if (!window.location.search) return false;

        const params = new URLSearchParams(window.location.search);
        let changed = false;

        const searchParam = params.get("search");
        if (searchInput && searchParam) {
            searchInput.value = searchParam;
            changed = true;
        }

        const categoryParams = params.getAll("category");
        if (categoryInputs.length && categoryParams.length) {
            const categories = categoryParams
                .flatMap((item) => item.split(","))
                .map((item) => item.trim())
                .filter(Boolean);

            if (categories.length) {
                categoryInputs.forEach((input) => {
                    input.checked = categories.includes(input.value);
                });
                changed = true;
            }
        }

        const brandParam = params.get("brand");
        if (brandSelect && brandParam) {
            brandSelect.value = brandParam;
            changed = true;
        }

        const modelParam = params.get("model");
        if (modelSelect && modelParam) {
            modelSelect.value = modelParam;
            changed = true;
        }

        const minParam = params.get("min");
        if (priceMinInput && minParam !== null && minParam !== "") {
            priceMinInput.value = minParam;
            changed = true;
        }

        const maxParam = params.get("max");
        if (priceMaxInput && maxParam !== null && maxParam !== "") {
            priceMaxInput.value = maxParam;
            changed = true;
        }

        if (changed) applyFilters();
        return changed;
    };

    const resetFilters = () => {
        if (searchInput) searchInput.value = "";
        categoryInputs.forEach((input) => {
            input.checked = false;
        });
        if (brandSelect) brandSelect.value = "";
        if (modelSelect) modelSelect.value = "";
        if (priceMinInput) priceMinInput.value = "";
        if (priceMaxInput) priceMaxInput.value = "";
        applyFilters();
    };

    if (applyButton) applyButton.addEventListener("click", applyFilters);
    if (resetButton) resetButton.addEventListener("click", resetFilters);

    if (searchInput) searchInput.addEventListener("input", applyFilters);
    if (priceMinInput) priceMinInput.addEventListener("input", applyFilters);
    if (priceMaxInput) priceMaxInput.addEventListener("input", applyFilters);

    categoryInputs.forEach((input) => {
        input.addEventListener("change", applyFilters);
    });

    if (brandSelect) brandSelect.addEventListener("change", applyFilters);
    if (modelSelect) modelSelect.addEventListener("change", applyFilters);

    const params = new URLSearchParams(window.location.search);
    const queryCategory = params.get("category");
    const querySearch = params.get("search");

    if (queryCategory) {
        categoryInputs.forEach((input) => {
            if (input.value === queryCategory) input.checked = true;
        });
    }

    if (querySearch && searchInput) {
        searchInput.value = querySearch;
    }

    if (!applyUrlFilters()) {
        applyFilters();
    }
}

function initFanEngine() {
    const engine = document.querySelector(".fan-engine");
    if (!engine) return;

    const wheel = engine.querySelector(".fan-wheel");
    const panel = engine.querySelector(".fan-engine-panel");
    const backButton = engine.querySelector(".fan-back");
    const tip = engine.querySelector(".fan-tip-text");
    const scrollButton = engine.querySelector(".fan-scroll");
    const downTarget = document.querySelector("#home-sections");

    if (!wheel || !panel) return;

    const fanTree = [
        {
            id: "ekim-gubreleme",
            title: "Ekim Makineleri",
            description: "Mibzer, gübre dağıtım ve hassas ekim sistemleri",
            tip: "Ekim makineleri ve parçalarını görmek için bir alt kategori seç.",
            children: [
                { title: "Hububat Ekim Mibzeri", description: "Pnömatik ve mekanik mibzer serileri", query: "category=ekim-gubreleme&search=mibzer" },
                { title: "Gübreleme Sistemleri", description: "Ayarlı gübre dozaj ekipmanları", query: "category=ekim-gubreleme&search=gubre" },
                { title: "Ekim Makinesi Yedek Parçası", description: "Disk, ayak ve aktarma parçaları", query: "category=yedek-parca&search=ekim" }
            ]
        },
        {
            id: "toprak-isleme",
            title: "Toprak İşleme",
            description: "Goble, kültivatör, diskaro ve hazırlık ekipmanları",
            tip: "Toprak işleme makineleri için ürün grubunu seç.",
            children: [
                { title: "Diskli Goble", description: "Hidrolik merdaneli goble modelleri", query: "category=toprak-isleme&search=goble" },
                { title: "Kültivatör", description: "Ayarlanabilir ayaklı kültivatör çözümleri", query: "category=toprak-isleme&search=kultivator" },
                { title: "Toprak İşleme Yedek Parçası", description: "Disk, bıçak ve bağlantı parçaları", query: "category=yedek-parca&search=toprak" }
            ]
        },
        {
            id: "hasat-harman",
            title: "Hasat & Harman",
            description: "Biçim, toplama ve harman süreçleri",
            tip: "Hasat ürünlerini görmek için alt kırılımı seç.",
            children: [
                { title: "Hasat Ekipmanları", description: "Biçim ve toplama odaklı makineler", query: "category=hasat-harman&search=hasat" },
                { title: "Harman Çözümleri", description: "Verim odaklı harman ekipmanları", query: "category=hasat-harman&search=harman" },
                { title: "Hasat Yedek Parçaları", description: "Aşınan parçalara hızlı erişim", query: "category=yedek-parca&search=hasat" }
            ]
        }
    ];


    const renderItems = (items, isChild = false) => {
        panel.dataset.level = isChild ? "child" : "root";
        wheel.classList.remove("is-switching");
        void wheel.offsetWidth;
        wheel.classList.add("is-switching");
        wheel.innerHTML = "";

        items.forEach((item) => {
            const button = document.createElement("button");
            button.className = "fan-chip";
            button.type = "button";
            button.innerHTML = `<h3>${item.title}</h3><p>${item.description}</p><small>${isChild ? "Ürünleri Gör" : "Alt Kategorilere Geç"}</small>`;

            button.addEventListener("click", () => {
                if (!isChild) {
                    if (tip) tip.textContent = item.tip || "Alt kategori seçimi yap.";
                    renderItems(item.children || [], true);
                    return;
                }

                if (item.query) {
                    window.location.href = `shop.html?${item.query}`;
                }
            });

            wheel.appendChild(button);
        });
    };

    if (backButton) {
        backButton.addEventListener("click", () => {
            if (tip) tip.textContent = "Ana kategori seçerek detaylara geçebilirsin.";
            renderItems(fanTree, false);
        });
    }

    if (scrollButton && downTarget) {
        scrollButton.addEventListener("click", () => {
            downTarget.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }

    renderItems(fanTree, false);
}z

function initSlider() {
    const slider = document.querySelector(".slider");
    if (!slider) return;

    const items = Array.from(slider.querySelectorAll(".slider-item"));
    if (!items.length) return;

    const dots = Array.from(slider.querySelectorAll(".slider-dot"));
    const buttons = slider.querySelectorAll(".slider-buttons button");
    const prevButton = buttons[0];
    const nextButton = buttons[1];
    const downButton = slider.querySelector(".down-button button");
    const downTarget = document.querySelector("#home-sections");

    let current = items.findIndex((item) => item.classList.contains("active"));
    if (current < 0) current = 0;

    const showSlide = (index) => {
        current = (index + items.length) % items.length;
        items.forEach((item, i) => {
            item.classList.toggle("active", i === current);
        });
        dots.forEach((dot, i) => {
            dot.classList.toggle("active", i === current);
        });
    };

    const nextSlide = () => showSlide(current + 1);
    const prevSlide = () => showSlide(current - 1);

    let timer = null;
    const stopAuto = () => {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
    };

    const startAuto = () => {
        stopAuto();
        timer = setInterval(nextSlide, 5000);
    };

    if (nextButton) {
        nextButton.addEventListener("click", () => {
            nextSlide();
            startAuto();
        });
    }

    if (prevButton) {
        prevButton.addEventListener("click", () => {
            prevSlide();
            startAuto();
        });
    }

    if (downButton && downTarget) {
        downButton.addEventListener("click", (event) => {
            event.preventDefault();
            downTarget.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }

    dots.forEach((dot, index) => {
        dot.addEventListener("click", () => {
            showSlide(index);
            startAuto();
        });
    });

    showSlide(current);
    startAuto();
}
