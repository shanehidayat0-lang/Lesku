
const KEY = "lesku_pwa_data_v1";
let lessons = [];
let filter = "upcoming";
let installPrompt = null;

const $ = id => document.getElementById(id);

function today() {
  const d = new Date();
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "[]");
    lessons = Array.isArray(data) ? data : [];
  } catch {
    lessons = [];
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(lessons));
    render();
  } catch {
    alert("Data gagal disimpan. Periksa penyimpanan browser.");
  }
}

function dateText(date) {
  return new Date(date + "T12:00:00").toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function statusText(status) {
  return ({
    pending: "Belum dikonfirmasi",
    ikut: "Ikut les",
    sakit: "Sakit",
    urusan: "Urusan mendadak",
    selesai: "Selesai"
  })[status] || status;
}

function render() {
  const now = today();

  $("upcoming").textContent = lessons.filter(
    x => x.date >= now && x.status !== "selesai"
  ).length;

  $("attending").textContent = lessons.filter(
    x => x.status === "ikut"
  ).length;

  $("absent").textContent = lessons.filter(
    x => ["sakit", "urusan"].includes(x.status)
  ).length;

  let items = [...lessons].sort((a, b) =>
    (a.date + a.time).localeCompare(b.date + b.time)
  );

  if (filter === "upcoming") {
    items = items.filter(x =>
      x.date >= now && x.status !== "selesai"
    );
  } else if (filter === "history") {
    items = items.filter(x =>
      x.date < now || x.status === "selesai"
    );
  }

  const root = $("lessonList");
  root.replaceChildren();

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Belum ada jadwal di bagian ini.";
    root.appendChild(empty);
    return;
  }

  items.forEach(x => {
    const card = document.createElement("article");
    card.className = "lesson-card";

    const title = document.createElement("h3");
    title.textContent = x.name;
    card.appendChild(title);

    const info = document.createElement("p");
    info.className = "lesson-info";
    info.textContent = dateText(x.date) + " · " + x.time +
      (x.place ? " · " + x.place : "");
    card.appendChild(info);

    if (x.notes) {
      const note = document.createElement("p");
      note.className = "muted";
      note.textContent = "Catatan: " + x.notes;
      card.appendChild(note);
    }

    const status = document.createElement("p");
    status.className = "muted";
    status.textContent = "Status: " + statusText(x.status) +
      (x.reason ? " · Alasan: " + x.reason : "");
    card.appendChild(status);

    const group = document.createElement("div");
    group.className = "attendance-options";

    [
      ["ikut", "Ikut les"],
      ["sakit", "Tidak ikut — sakit"],
      ["urusan", "Tidak ikut — urusan mendadak"]
    ].forEach(([value, label]) => {
      const wrapper = document.createElement("label");
      wrapper.className = "attendance-option";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "attendance-" + x.id;
      radio.value = value;
      radio.checked = x.status === value;

      const text = document.createElement("span");
      text.textContent = label;

      radio.addEventListener("change", () => {
        x.status = value;
        x.reason = value === "sakit" ? "Sakit" :
          value === "urusan" ? "Urusan mendadak" : "";
        save();
      });

      wrapper.append(radio, text);
      group.appendChild(wrapper);
    });

    card.appendChild(group);

    const done = document.createElement("button");
    done.className = "secondary";
    done.textContent = x.status === "selesai"
      ? "Batalkan selesai" : "Tandai selesai";
    done.onclick = () => {
      x.status = x.status === "selesai" ? "pending" : "selesai";
      x.reason = "";
      save();
    };
    card.appendChild(done);

    const del = document.createElement("button");
    del.className = "danger";
    del.textContent = "Hapus";
    del.onclick = () => {
      if (confirm("Hapus jadwal " + x.name + "?")) {
        lessons = lessons.filter(y => y.id !== x.id);
        save();
      }
    };
    card.appendChild(del);

    root.appendChild(card);
  });
}

// Tambah jadwal
$("lessonForm").addEventListener("submit", event => {
  event.preventDefault();

  const name = $("name").value.trim();
  const date = $("date").value;
  const time = $("time").value;

  if (!name || !date || !time) {
    alert("Lengkapi nama, tanggal, dan jam les.");
    return;
  }

  lessons.push({
    id: Date.now().toString(36) +
      Math.random().toString(36).slice(2),
    name,
    place: $("place").value.trim(),
    date,
    time,
    notes: $("notes").value.trim(),
    status: "pending",
    reason: "",
    notified: []
  });

  save();
  $("lessonForm").reset();
  $("date").value = today();
  $("time").value = "16:00";
});

// Filter jadwal
document.querySelectorAll("[data-filter]").forEach(button => {
  button.addEventListener("click", () => {
    filter = button.dataset.filter;

    document.querySelectorAll("[data-filter]").forEach(item => {
      item.classList.toggle("secondary", item !== button);
    });

    render();
  });
});

// Daftarkan service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("./sw.js");
      console.log("Service worker LesKu aktif.");
    } catch (error) {
      console.error("Service worker gagal:", error);
    }
  });
}

// Tombol instalasi jika browser mendukung
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  installPrompt = event;
  $("installButton").hidden = false;
});

$("installButton").addEventListener("click", async () => {
  if (!installPrompt) {
    alert("Jika tombol instalasi tidak tersedia, buka menu browser lalu pilih Tambahkan ke layar utama.");
    return;
  }

  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  $("installButton").hidden = true;
});

// Izin dan tes notifikasi
$("enableNotifications").addEventListener("click", async () => {
  if (!("Notification" in window)) {
    $("notificationStatus").textContent =
      "Browser ini tidak mendukung notifikasi web.";
    return;
  }

  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    $("notificationStatus").textContent =
      "Notifikasi memerlukan HTTPS dan dukungan service worker.";
    return;
  }

  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      $("notificationStatus").textContent =
        "Izin notifikasi belum diberikan.";
      return;
    }

    const registration = await navigator.serviceWorker.ready;

    await registration.showNotification("LesKu aktif!", {
      body: "Tes notifikasi berhasil. Pengingat terjadwal perlu push service.",
      icon: "./icon.svg",
      tag: "lesku-test"
    });

    $("notificationStatus").textContent =
      "Izin aktif. Notifikasi tes telah diminta.";
  } catch (error) {
    $("notificationStatus").textContent =
      "Notifikasi gagal. Periksa izin browser dan koneksi HTTPS.";
  }
});

// Pengingat saat halaman terbuka
function checkReminders() {
  const d = new Date();
  const now = today();
  const minutes = d.getHours() * 60 + d.getMinutes();

  // Cek dalam jendela pukul 07.00–07.10
  if (minutes < 420 || minutes > 430) return;

  let changed = false;

  lessons.forEach(x => {
    if (x.status === "selesai") return;

    const prevDate = new Date(x.date + "T12:00:00");
    prevDate.setDate(prevDate.getDate() - 1);

    const h1 = prevDate.getFullYear() + "-" +
      String(prevDate.getMonth() + 1).padStart(2, "0") + "-" +
      String(prevDate.getDate()).padStart(2, "0");

    const type = h1 === now ? "H-1" :
      x.date === now ? "Hari H" : null;

    if (!type) return;

    const key = type + "-" + now;
    if ((x.notified || []).includes(key)) return;

    x.notified = x.notified || [];
    x.notified.push(key);
    changed = true;

    const message = x.name +
      (type === "H-1" ? " besok" : " hari ini") +
      " pukul " + x.time;

    $("notice").textContent = "🔔 " + type + ": " + message;

    if ("Notification" in window &&
        Notification.permission === "granted") {
      navigator.serviceWorker.ready.then(registration =>
        registration.showNotification("LesKu · " + type, {
          body: message,
          icon: "./icon.svg",
          tag: "lesku-" + x.id + "-" + key
        })
      ).catch(() => {});
    }
  });

  if (changed) {
    try {
      localStorage.setItem(KEY, JSON.stringify(lessons));
    } catch {}
  }
}

// Ekspor dan impor cadangan
$("exportData").addEventListener("click", () => {
  const blob = new Blob(
    [JSON.stringify(lessons, null, 2)],
    { type: "application/json" }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cadangan-lesku.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

$("importButton").addEventListener("click", () => {
  $("importFile").click();
});

$("importFile").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const data = JSON.parse(await file.text());

    if (!Array.isArray(data) || !data.every(x =>
      x && typeof x.id === "string" &&
      typeof x.name === "string" &&
      typeof x.date === "string" &&
      typeof x.time === "string"
    )) {
      throw new Error("Format file tidak sesuai");
    }

    if (confirm("Ganti semua data saat ini dengan cadangan?")) {
      lessons = data;
      save();
      alert("Data berhasil diimpor.");
    }
  } catch {
    alert("File cadangan tidak valid.");
  }

  event.target.value = "";
});

$("date").min = today();
$("date").value = today();

load();
render();
checkReminders();
setInterval(checkReminders, 60000);
