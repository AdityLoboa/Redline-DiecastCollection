/* =========================================================
   REDLINE GARAGE — FINAL MAIN FRONTEND
   Supabase + collection + auctions + profile + game
========================================================= */

const sb = window.redlineSupabase;
let currentUser = null;
let auctions = [];
let collection = [];
let auctionTimer = null;
let refreshTimer = null;
let realtimeChannel = null;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const money = value => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
}[char]));

function toast(message, type = "info") {
    const container = $("#toastContainer");
    if (!container) return;

    const box = document.createElement("div");
    box.className = `toast ${type}`;
    box.innerHTML = `<span>${type === "success" ? "✓" : type === "error" ? "!" : "i"}</span><div>${esc(message)}</div>`;
    container.appendChild(box);

    requestAnimationFrame(() => box.classList.add("show"));
    setTimeout(() => {
        box.classList.remove("show");
        setTimeout(() => box.remove(), 300);
    }, 4200);
}

function openModal(id) {
    const modal = $(`#${id}`);
    if (!modal) return;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
}

function closeModal(id) {
    const modal = $(`#${id}`);
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
}

$("[data-close]") && $$ ("[data-close]").forEach(button => {
    button.addEventListener("click", () => closeModal(button.dataset.close));
});

$$ (".modal").forEach(modal => {
    modal.addEventListener("click", event => {
        if (event.target === modal) closeModal(modal.id);
    });
});

async function getCurrentUser() {
    if (!sb?.auth) {
        console.error("Redline Supabase client is unavailable.");
        return null;
    }

    const { data, error } = await sb.auth.getSession();
    if (error) console.error("Session error:", error);
    return data?.session?.user || null;
}

async function requireLogin() {
    currentUser = await getCurrentUser();
    if (!currentUser) {
        window.location.href = "auth.html";
        return false;
    }
    return true;
}

async function loadProfile() {
    const { data, error } = await sb
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

    if (error) console.error("Profile load error:", error);

    const profile = data || {};
    const name = profile.display_name || currentUser.user_metadata?.display_name || "Collector";
    const username = profile.username || currentUser.user_metadata?.username || "";

    $("#accountName").textContent = name;
    $("#accountEmail").textContent = currentUser.email || "";
    $("#accountAvatar").textContent = name.slice(0, 1).toUpperCase();
    $("#profileName").value = name;
    $("#profileUsername").value = username;
    $("#profileAddress").value = profile.permanent_address || "";
    $("#profileTempAddress").value = profile.temporary_address || "";
}

async function loadCollection() {
    const { data, error } = await sb
        .from("cars")
        .select("*")
        .eq("owner_id", currentUser.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Collection load error:", error);
        toast("Could not load your collection. Check the Supabase schema.", "error");
        return;
    }

    collection = data || [];

    $("#collectionGrid").innerHTML = collection.length
        ? collection.map(car => `
            <article class="car-card reveal">
                <div class="car-image">
                    <img src="${esc(car.image_url || "CarImage/1.jpg")}" alt="${esc(car.name)}" loading="lazy">
                </div>
                <div class="car-info">
                    <span class="eyebrow">${esc(car.tag || "COLLECTIBLE")}</span>
                    <h3>${esc(car.name)}</h3>
                    <p>${esc(car.manufacturer || "")} ${esc(car.model || "")} • ${Number(car.horsepower || 0)} HP</p>
                    <div class="car-specs">
                        <span><strong>${Number(car.horsepower || 0)}</strong> HP</span>
                        <span><strong>${money(car.value)}</strong> Value</span>
                    </div>
                    <div class="car-action">
                        <span class="small-label">IN YOUR GARAGE</span>
                    </div>
                </div>
            </article>
        `).join("")
        : `<div class="empty-state">No rides yet. Add your first ride below.</div>`;

    // Make car cards immediately visible
    $$(".car-card.reveal").forEach(element => element.classList.add("in-view"));

    $("#statCollected").textContent = collection.length;
    $("#accountCollection").textContent = `${collection.length} cars`;
    $("#statValue").textContent = money(
        collection.reduce((total, car) => total + Number(car.value || 0), 0)
    );
    $("#submittedCount").textContent = `${collection.length} rides`;
}

async function settleExpired() {
    const { error } = await sb.rpc("settle_expired_auctions");
    if (error && !/function/i.test(error.message || "")) {
        console.warn("settle_expired_auctions:", error.message);
    }
}

async function getBidCounts() {
    const { data, error } = await sb.rpc("get_auction_bid_counts");
    if (error) {
        console.warn("Bid-count RPC unavailable:", error.message);
        return new Map();
    }

    return new Map((data || []).map(row => [row.auction_id, Number(row.bid_count || 0)]));
}

async function loadAuctions() {
    await settleExpired();

    const [{ data, error }, bidCounts] = await Promise.all([
        sb.from("auctions")
            .select("*,cars!auctions_car_id_fkey(*)")
            .in("status", ["scheduled", "live"])
            .order("ends_at", { ascending: true }),
        getBidCounts()
    ]);

    if (error) {
        console.error("Auction load error:", error);
        toast("Could not load auctions. Check the Supabase schema.", "error");
        return;
    }

    auctions = (data || []).map(auction => ({
        ...auction,
        bid_count: bidCounts.get(auction.id) ?? 0
    }));

    renderAuctions();
    
    // Make auction cards immediately visible
    $$(".auction-card.reveal").forEach(element => element.classList.add("in-view"));
    
    $("#statAuctions").textContent = auctions.filter(a => a.status === "live").length;
}

function renderAuctions() {
    const grid = $("#auctionGrid");
    if (!grid) return;

    if (!auctions.length) {
        grid.innerHTML = `<div class="empty-state">No live auctions right now. Create one in Add Your Car.</div>`;
        return;
    }

    grid.innerHTML = auctions.map(auction => {
        const car = auction.cars || {};
        const scheduled = auction.status === "scheduled";

        return `
            <article class="auction-card reveal" data-auction="${esc(auction.id)}">
                <div class="auction-image">
                    <img src="${esc(car.image_url || auction.image_url || "CarImage/1.jpg")}" alt="${esc(car.name || auction.title)}" loading="lazy">
                    <span class="auction-badge">${scheduled ? "STARTING SOON" : "LIVE"}</span>
                </div>
                <div class="auction-info">
                    <p class="eyebrow">${esc(car.manufacturer || "REDLINE")}</p>
                    <h3>${esc(car.name || auction.title)}</h3>
                    <p>${esc(car.model || "")} • ${Number(car.horsepower || 0)} HP</p>
                    <div class="countdown" data-end="${esc(auction.ends_at)}" data-start="${esc(auction.starts_at)}"></div>
                    <div class="auction-price">
                        <span>Current Bid</span>
                        <strong>${money(auction.current_bid || auction.starting_bid)}</strong>
                    </div>
                    <div class="auction-action">
                        <button class="btn primary bid-btn" data-id="${esc(auction.id)}" ${scheduled ? "disabled" : ""}>
                            ${scheduled ? "Not Live Yet" : "Place Bid"}
                        </button>
                        <span class="bid-count">${Number(auction.bid_count || 0)} bids</span>
                    </div>
                </div>
            </article>
        `;
    }).join("");

    $$(".bid-btn").forEach(button => {
        button.addEventListener("click", () => openBid(button.dataset.id));
    });

    updateCountdowns();
}

function formatRemaining(milliseconds) {
    if (milliseconds <= 0) return "00:00:00";

    let seconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(seconds / 86400);
    seconds %= 86400;
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    seconds %= 60;

    return `${days ? String(days).padStart(2, "0") + ":" : ""}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updateCountdowns() {
    clearInterval(auctionTimer);

    const tick = async () => {
        let expired = false;

        $$(".countdown").forEach(element => {
            const start = new Date(element.dataset.start).getTime();
            const end = new Date(element.dataset.end).getTime();
            const now = Date.now();

            if (now < start) {
                element.textContent = `STARTS IN ${formatRemaining(start - now)}`;
                element.classList.add("starting");
            } else if (now < end) {
                element.textContent = `ENDS IN ${formatRemaining(end - now)}`;
                element.classList.remove("starting");
            } else {
                element.textContent = "AUCTION ENDED";
                expired = true;
            }
        });

        if (expired) {
            await loadAuctions();
            await loadNotifications();
        }
    };

    tick();
    auctionTimer = setInterval(tick, 1000);
}

async function openBid(id) {
    const auction = auctions.find(item => item.id === id);
    if (!auction) return;

    const minimum = Number(auction.current_bid || auction.starting_bid) + Number(auction.min_increment || 1);
    $("#bidAuctionId").value = id;
    $("#bidTitle").textContent = `Bid on ${auction.cars?.name || "this ride"}`;
    $("#bidCurrent").textContent = `Current bid: ${money(auction.current_bid || auction.starting_bid)} • Minimum accepted: ${money(minimum)}`;
    $("#bidAmount").min = minimum;
    $("#bidAmount").value = minimum;
    openModal("bidModal");
}

$("#bidForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    const auctionId = $("#bidAuctionId").value;
    const amount = Number($("#bidAmount").value);
    const button = event.submitter;

    if (!Number.isFinite(amount) || amount <= 0) {
        toast("Enter a valid bid amount.", "error");
        return;
    }

    button.disabled = true;
    button.textContent = "PLACING BID…";

    try {
        const { error } = await sb.rpc("place_bid", {
            p_auction_id: auctionId,
            p_amount: amount
        });
        if (error) throw error;

        toast(`Bid placed at ${money(amount)}.`, "success");
        closeModal("bidModal");
        await Promise.all([loadAuctions(), loadStats(), loadNotifications()]);
    } catch (error) {
        console.error("Bid error:", error);
        toast(error.message || "Bid failed. Try again.", "error");
    } finally {
        button.disabled = false;
        button.textContent = "Place Bid";
    }
});

async function loadNotifications() {
    const { data, error } = await sb
        .from("notifications")
        .select("*")
        .eq("user_id", currentUser.id)
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(5);

    if (error) {
        console.warn("Notification load error:", error.message);
        return;
    }

    for (const notification of (data || []).slice(0, 3)) {
        toast(
            notification.title + (notification.message ? ` — ${notification.message}` : ""),
            notification.type || "info"
        );
        await sb.from("notifications").update({ read: true }).eq("id", notification.id);
    }
}

function openCheckout(id, name) {
    $("#checkoutCarId").value = id;
    $("#checkoutTitle").textContent = `Ship ${name}`;
    $("#shipName").value = $("#accountName").textContent === "Loading…" ? "" : $("#accountName").textContent;
    openModal("checkoutModal");
}

$("#checkoutForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.submitter;
    button.disabled = true;
    button.textContent = "PLACING ORDER…";

    try {
        const { error } = await sb.from("orders").insert({
            buyer_id: currentUser.id,
            car_id: $("#checkoutCarId").value,
            full_name: $("#shipName").value.trim(),
            phone: $("#shipPhone").value.trim(),
            shipping_address: $("#shipAddress").value.trim(),
            pin_code: $("#shipPin").value.trim(),
            status: "pending"
        });
        if (error) throw error;

        toast("Order placed. Your shipping details are saved with the order.", "success");
        closeModal("checkoutModal");
        await loadStats();
    } catch (error) {
        console.error("Order error:", error);
        toast(error.message || "Order could not be created.", "error");
    } finally {
        button.disabled = false;
        button.textContent = "Place Order";
    }
});

$("#profileForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.submitter;
    button.disabled = true;

    try {
        const payload = {
            id: currentUser.id,
            display_name: $("#profileName").value.trim(),
            username: $("#profileUsername").value.trim().toLowerCase(),
            permanent_address: $("#profileAddress").value.trim(),
            temporary_address: $("#profileTempAddress").value.trim(),
            updated_at: new Date().toISOString()
        };

        const { error } = await sb.from("profiles").upsert(payload, { onConflict: "id" });
        if (error) throw error;

        const { error: authError } = await sb.auth.updateUser({
            data: {
                display_name: payload.display_name,
                username: payload.username
            }
        });
        if (authError) console.warn("Auth metadata update:", authError);

        toast("Profile updated successfully.", "success");
        closeModal("profileModal");
        await loadProfile();
    } catch (error) {
        console.error("Profile update error:", error);
        toast(error.message || "Profile update failed.", "error");
    } finally {
        button.disabled = false;
    }
});

$("#editProfileBtn")?.addEventListener("click", () => openModal("profileModal"));

$("#signOutBtn")?.addEventListener("click", async () => {
    const button = $("#signOutBtn");
    button.disabled = true;

    const { error } = await sb.auth.signOut();
    if (error) {
        toast(error.message, "error");
        button.disabled = false;
        return;
    }

    window.location.href = "auth.html";
});

$("#rideImage")?.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = result => {
        $("#uploadPreview").innerHTML = `<img src="${result.target.result}" alt="Upload preview">`;
    };
    reader.readAsDataURL(file);
});

async function uploadImage(file) {
    const extension = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${currentUser.id}/${crypto.randomUUID()}.${extension}`;

    const { error } = await sb.storage.from("car-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
    });

    if (error) throw error;

    const { data } = sb.storage.from("car-images").getPublicUrl(path);
    return data.publicUrl;
}

$("#rideForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    const form = event.currentTarget;
    const mode = event.submitter?.value || "collection";
    const file = $("#rideImage").files?.[0];
    const buttons = $$(".form-actions button");

    if (!file) {
        toast("Please choose an image.", "error");
        return;
    }

    if (mode === "auction" && !Number($("#auctionStart").value)) {
        toast("Enter a starting bid before creating an auction.", "error");
        return;
    }

    buttons.forEach(button => button.disabled = true);

    try {
        const imageUrl = await uploadImage(file);
        const carPayload = {
            owner_id: currentUser.id,
            name: form.name.value.trim(),
            manufacturer: form.manufacturer.value.trim(),
            model: form.model.value.trim(),
            year: form.year.value ? Number(form.year.value) : null,
            horsepower: form.horsepower.value ? Number(form.horsepower.value) : null,
            value: form.value.value ? Number(form.value.value) : 0,
            description: form.description.value.trim(),
            image_url: imageUrl
        };

        const { data: car, error: carError } = await sb
            .from("cars")
            .insert(carPayload)
            .select()
            .single();
        if (carError) throw carError;

        if (mode === "auction") {
            const startingBid = Number($("#auctionStart").value);
            const durationMinutes = Number($("#auctionDuration").value) || 60;
            const startsAt = new Date();
            const endsAt = new Date(Date.now() + durationMinutes * 60000);

            const { error: auctionError } = await sb.from("auctions").insert({
                seller_id: currentUser.id,
                car_id: car.id,
                title: car.name,
                starting_bid: startingBid,
                current_bid: startingBid,
                min_increment: Math.max(1, Math.ceil(startingBid * 0.05)),
                starts_at: startsAt.toISOString(),
                ends_at: endsAt.toISOString(),
                status: "live"
            });
            if (auctionError) throw auctionError;

            toast("Auction is live. Collectors can bid now.", "success");
        } else {
            toast("Ride added to your collection.", "success");
        }

        form.reset();
        $("#uploadPreview").innerHTML = `<div class="preview-placeholder"><strong>IMAGE PREVIEW</strong><span>Your uploaded image will appear here</span></div>`;
        await Promise.all([loadCollection(), loadAuctions()]);
    } catch (error) {
        console.error("Ride save error:", error);
        toast(error.message || "Could not save ride.", "error");
    } finally {
        buttons.forEach(button => button.disabled = false);
    }
});

async function loadStats() {
    const [{ count: bids, error: bidError }, { count: orders, error: orderError }] = await Promise.all([
        sb.from("bids").select("*", { count: "exact", head: true }).eq("bidder_id", currentUser.id),
        sb.from("orders").select("*", { count: "exact", head: true }).eq("buyer_id", currentUser.id)
    ]);

    if (bidError) console.warn("Bid stats error:", bidError.message);
    if (orderError) console.warn("Order stats error:", orderError.message);

    $("#statBids").textContent = bids || 0;
    $("#accountBids").textContent = `${bids || 0} active bids`;
    $("#accountOrders").textContent = `${orders || 0} purchases`;
}

function setupRealtime() {
    if (realtimeChannel) sb.removeChannel(realtimeChannel);

    realtimeChannel = sb.channel("redline-live")
        .on("postgres_changes", { event: "*", schema: "public", table: "auctions" }, async () => {
            await loadAuctions();
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "bids" }, async payload => {
            if (payload.new?.bidder_id === currentUser.id) {
                toast(`Your bid is now ${money(payload.new.amount)}.`, "success");
            }
            await Promise.all([loadAuctions(), loadStats()]);
        })
        .on("postgres_changes", {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${currentUser.id}`
        }, async () => {
            await loadNotifications();
        })
        .subscribe(status => console.log("Realtime status:", status));
}

function setupScroll() {
    if ("IntersectionObserver" in window) {
        const revealObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("in-view");
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });

        $$(".reveal").forEach(element => revealObserver.observe(element));
    } else {
        $$(".reveal").forEach(element => element.classList.add("in-view"));
    }

    const video = $("#scrollVideo");
    if (video) {
        let videoFrame = 0;

        const syncVideo = () => {
            const maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
            const progress = Math.min(1, Math.max(0, scrollY / maxScroll));

            if (video.readyState >= 1 && Number.isFinite(video.duration) && video.duration > 0) {
                const target = progress * video.duration;
                if (Math.abs(video.currentTime - target) > 0.035) video.currentTime = target;
            }
        };

        const requestSync = () => {
            cancelAnimationFrame(videoFrame);
            videoFrame = requestAnimationFrame(syncVideo);
        };

        video.pause();
        video.addEventListener("loadedmetadata", syncVideo);
        window.addEventListener("scroll", requestSync, { passive: true });
        window.addEventListener("resize", requestSync, { passive: true });
        requestSync();
    }

    const links = $$(".nav-link");
    const sections = $$("main section[id]");

    const setActive = id => {
        links.forEach(link => {
            const active = link.getAttribute("href") === `#${id}`;
            link.classList.toggle("active", active);
            if (active) link.setAttribute("aria-current", "page");
            else link.removeAttribute("aria-current");
        });
    };

    if ("IntersectionObserver" in window) {
        const sectionObserver = new IntersectionObserver(entries => {
            const visible = entries.filter(entry => entry.isIntersecting);
            if (!visible.length) return;

            visible.sort((a, b) =>
                Math.abs(a.boundingClientRect.top - innerHeight * 0.42) -
                Math.abs(b.boundingClientRect.top - innerHeight * 0.42)
            );
            setActive(visible[0].target.id);
        }, { rootMargin: "-30% 0px -55% 0px", threshold: [0, .12, .35, .6] });

        sections.forEach(section => sectionObserver.observe(section));
    }
}

function setupMenu() {
    const toggle = $("#menuToggle");
    const nav = $("#mainNav");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", () => {
        const open = nav.classList.toggle("open");
        toggle.setAttribute("aria-expanded", String(open));
    });

    $$(".nav-link").forEach(link => {
        link.addEventListener("click", () => {
            nav.classList.remove("open");
            toggle.setAttribute("aria-expanded", "false");
        });
    });
}

function setupGame() {
    const canvas = $("#gameCanvas");
    const context = canvas?.getContext("2d");
    const startButton = $("#startGame");
    const scoreElement = $("#gameScore");
    const statusElement = $("#gameStatus");

    if (!canvas || !context || !startButton) return;

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;
    const road = { left: 185, right: 815 };
    const laneWidth = (road.right - road.left) / 3;
    const laneCenter = lane => road.left + laneWidth * (lane + 0.5);

    let running = false;
    let gameOver = false;
    let score = 0;
    let highScore = Number(localStorage.getItem("redlineSprintHighScore") || 0);
    let lastTime = 0;
    let animationFrame = 0;
    let roadOffset = 0;
    let spawnTimer = 0;
    let playerX = laneCenter(1);
    let targetX = playerX;
    let obstacles = [];
    let particles = [];
    let pointerActive = false;

    const keys = new Set();

    function resetGame() {
        running = false;
        gameOver = false;
        score = 0;
        lastTime = 0;
        roadOffset = 0;
        spawnTimer = 0;
        playerX = laneCenter(1);
        targetX = playerX;
        obstacles = [];
        particles = [];
        scoreElement.textContent = "000000";
        statusElement.textContent = highScore ? `BEST ${String(highScore).padStart(6, "0")}` : "READY";
        startButton.textContent = "Start Game";
        draw(0);
    }

    function startGame() {
        if (running) return;
        running = true;
        gameOver = false;
        score = 0;
        roadOffset = 0;
        spawnTimer = 0;
        playerX = laneCenter(1);
        targetX = playerX;
        obstacles = [];
        particles = [];
        statusElement.textContent = "RUNNING";
        startButton.textContent = "Restart Game";
        cancelAnimationFrame(animationFrame);
        animationFrame = requestAnimationFrame(loop);
    }

    function spawnObstacle() {
        const lane = Math.floor(Math.random() * 3);
        const colors = ["#C1121F", "#F2F0EA", "#7A7A7A"];
        obstacles.push({
            lane,
            x: laneCenter(lane),
            y: -110,
            width: 62,
            height: 100,
            speed: 260 + Math.min(score * 1.6, 180),
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }

    function addCrashParticles(x, y) {
        for (let i = 0; i < 28; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 80 + Math.random() * 220;
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.5 + Math.random() * 0.6,
                maxLife: 0.5 + Math.random() * 0.6,
                size: 2 + Math.random() * 5
            });
        }
    }

    function movePlayer(direction) {
        targetX += direction * laneWidth;
        targetX = Math.max(road.left + 45, Math.min(road.right - 45, targetX));
    }

    function canvasPoint(event) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left) * (WIDTH / rect.width),
            y: (event.clientY - rect.top) * (HEIGHT / rect.height)
        };
    }

    function checkCollision(obstacle) {
        const player = { x: playerX - 25, y: HEIGHT - 112, width: 50, height: 84 };
        const enemy = {
            x: obstacle.x - obstacle.width / 2,
            y: obstacle.y,
            width: obstacle.width,
            height: obstacle.height
        };

        return player.x < enemy.x + enemy.width - 8 &&
            player.x + player.width > enemy.x + 8 &&
            player.y < enemy.y + enemy.height - 10 &&
            player.y + player.height > enemy.y + 10;
    }

    function crash() {
        running = false;
        gameOver = true;
        addCrashParticles(playerX, HEIGHT - 70);
        highScore = Math.max(highScore, score);
        localStorage.setItem("redlineSprintHighScore", String(highScore));
        statusElement.textContent = `CRASHED • BEST ${String(highScore).padStart(6, "0")}`;
        startButton.textContent = "Race Again";
    }

    function drawBackground() {
        context.fillStyle = "#0A0A0A";
        context.fillRect(0, 0, WIDTH, HEIGHT);

        const gradient = context.createLinearGradient(0, 0, 0, HEIGHT);
        gradient.addColorStop(0, "#242424");
        gradient.addColorStop(1, "#101010");
        context.fillStyle = gradient;
        context.fillRect(road.left, 0, road.right - road.left, HEIGHT);

        context.fillStyle = "#C1121F";
        context.fillRect(road.left - 5, 0, 5, HEIGHT);
        context.fillRect(road.right, 0, 5, HEIGHT);

        context.strokeStyle = "rgba(242,240,234,.55)";
        context.lineWidth = 5;
        context.setLineDash([35, 32]);
        context.lineDashOffset = roadOffset;
        for (let lane = 1; lane < 3; lane++) {
            const x = road.left + laneWidth * lane;
            context.beginPath();
            context.moveTo(x, -50);
            context.lineTo(x, HEIGHT + 50);
            context.stroke();
        }
        context.setLineDash([]);

        context.fillStyle = "rgba(242,240,234,.08)";
        for (let i = 0; i < 18; i++) {
            const y = ((i * 72 + roadOffset * .8) % (HEIGHT + 80)) - 40;
            context.fillRect(road.left + 18, y, 3, 22);
            context.fillRect(road.right - 21, y, 3, 22);
        }
    }

    function drawCar(x, y, color, player = false) {
        context.save();
        context.translate(x, y);

        context.shadowColor = player ? "rgba(193,18,31,.5)" : "rgba(0,0,0,.5)";
        context.shadowBlur = player ? 22 : 10;

        context.fillStyle = color;
        context.beginPath();
        context.roundRect(-25, -42, 50, 84, 11);
        context.fill();

        context.shadowBlur = 0;
        context.fillStyle = player ? "#F2F0EA" : "#151515";
        context.beginPath();
        context.roundRect(-17, -25, 34, 29, 7);
        context.fill();

        context.fillStyle = player ? "#202020" : "#777";
        context.fillRect(-14, 11, 28, 16);

        context.fillStyle = "#F2F0EA";
        context.fillRect(-18, -38, 10, 5);
        context.fillRect(8, -38, 10, 5);

        context.fillStyle = "#C1121F";
        context.fillRect(-18, 32, 10, 5);
        context.fillRect(8, 32, 10, 5);

        context.restore();
    }

    function drawParticles() {
        particles.forEach(particle => {
            context.globalAlpha = Math.max(0, particle.life / particle.maxLife);
            context.fillStyle = "#F2F0EA";
            context.fillRect(particle.x, particle.y, particle.size, particle.size);
        });
        context.globalAlpha = 1;
    }

    function draw(time) {
        drawBackground();

        obstacles.forEach(obstacle => drawCar(obstacle.x, obstacle.y + obstacle.height / 2, obstacle.color));
        drawCar(playerX, HEIGHT - 70, "#C1121F", true);
        drawParticles();

        if (!running && !gameOver) {
            context.fillStyle = "rgba(10,10,10,.38)";
            context.fillRect(road.left, 0, road.right - road.left, HEIGHT);
            context.fillStyle = "#F2F0EA";
            context.textAlign = "center";
            context.font = "900 28px Inter, Arial, sans-serif";
            context.fillText("REDLINE SPRINT", WIDTH / 2, HEIGHT / 2 - 12);
            context.font = "600 13px Inter, Arial, sans-serif";
            context.fillStyle = "rgba(242,240,234,.7)";
            context.fillText("Choose a lane and stay alive.", WIDTH / 2, HEIGHT / 2 + 18);
        }

        if (gameOver) {
            context.fillStyle = "rgba(10,10,10,.62)";
            context.fillRect(road.left, 0, road.right - road.left, HEIGHT);
            context.fillStyle = "#F2F0EA";
            context.textAlign = "center";
            context.font = "900 32px Inter, Arial, sans-serif";
            context.fillText("CRASHED", WIDTH / 2, HEIGHT / 2 - 12);
            context.font = "600 14px Inter, Arial, sans-serif";
            context.fillStyle = "rgba(242,240,234,.72)";
            context.fillText(`SCORE ${String(score).padStart(6, "0")} • BEST ${String(highScore).padStart(6, "0")}`, WIDTH / 2, HEIGHT / 2 + 18);
        }
    }

    function loop(time) {
        if (!running) {
            draw(time);
            return;
        }

        const delta = Math.min(0.032, (time - lastTime) / 1000 || 0);
        lastTime = time;

        const difficulty = Math.min(1.65, 1 + score / 1500);
        roadOffset = (roadOffset + 240 * difficulty * delta) % 67;
        spawnTimer += delta;

        const spawnEvery = Math.max(0.42, 0.95 - score / 2500);
        if (spawnTimer >= spawnEvery) {
            spawnTimer = 0;
            spawnObstacle();
        }

        const steerSpeed = 620;
        if (keys.has("arrowleft") || keys.has("a")) targetX -= steerSpeed * delta;
        if (keys.has("arrowright") || keys.has("d")) targetX += steerSpeed * delta;
        targetX = Math.max(road.left + 45, Math.min(road.right - 45, targetX));
        playerX += (targetX - playerX) * Math.min(1, delta * 12);

        obstacles.forEach(obstacle => {
            obstacle.y += obstacle.speed * difficulty * delta;
        });

        obstacles = obstacles.filter(obstacle => obstacle.y < HEIGHT + 120);

        for (const obstacle of obstacles) {
            if (checkCollision(obstacle)) {
                crash();
                break;
            }
        }

        particles.forEach(particle => {
            particle.x += particle.vx * delta;
            particle.y += particle.vy * delta;
            particle.vy += 260 * delta;
            particle.life -= delta;
        });
        particles = particles.filter(particle => particle.life > 0);

        score += Math.floor(delta * 100);
        scoreElement.textContent = String(score).padStart(6, "0");

        draw(time);
        if (running) animationFrame = requestAnimationFrame(loop);
    }

    addEventListener("keydown", event => {
        const key = event.key.toLowerCase();
        if (["arrowleft", "arrowright", "a", "d", " "].includes(key)) event.preventDefault();
        keys.add(key);
    });

    addEventListener("keyup", event => keys.delete(event.key.toLowerCase()));

    canvas.addEventListener("pointerdown", event => {
        pointerActive = true;
        canvas.setPointerCapture?.(event.pointerId);
        const point = canvasPoint(event);
        targetX = point.x;
    });

    canvas.addEventListener("pointermove", event => {
        if (!pointerActive || !running) return;
        targetX = canvasPoint(event).x;
        targetX = Math.max(road.left + 45, Math.min(road.right - 45, targetX));
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach(type => {
        canvas.addEventListener(type, () => pointerActive = false);
    });

    startButton.addEventListener("click", startGame);
    resetGame();
}

(async function init() {
    if (!sb) {
        console.error("Redline Supabase client was not created. Check Sub.js.");
        return;
    }

    if (!(await requireLogin())) return;

    setupMenu();
    setupScroll();
    setupGame();

    await Promise.all([
        loadProfile(),
        loadCollection(),
        loadAuctions(),
        loadStats(),
        loadNotifications()
    ]);

    setupRealtime();
    refreshTimer = setInterval(async () => {
        await settleExpired();
        await loadAuctions();
    }, 15000);
})();