const config = window.DZAIRLY_CONFIG || {};

function qs(id) { return document.getElementById(id); }

function serializeForm(form) {
  const data = {};
  new FormData(form).forEach((value, key) => {
    if (data[key] !== undefined) {
      data[key] = Array.isArray(data[key]) ? [...data[key], value] : [data[key], value];
    } else {
      data[key] = value;
    }
  });
  return data;
}

function cleanOptional(value) {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function normalizePayload(form, raw) {
  const payload = { ...raw, source: "website", status: "new" };
  if (form.elements.consent) payload.consent = form.elements.consent.checked === true;

  if (form.id === "eventForm") {
    payload.services = [...form.querySelectorAll('input[name="services"]:checked')].map(el => el.value);
    payload.event_date = cleanOptional(payload.event_date);
    payload.last_name = cleanOptional(payload.last_name);
    payload.guest_count = cleanOptional(payload.guest_count);
    payload.budget_range = cleanOptional(payload.budget_range);
    payload.message = cleanOptional(payload.message);
  }
  if (form.id === "vendorForm") {
    payload.website = cleanOptional(payload.website);
    payload.description = cleanOptional(payload.description);
  }
  if (form.id === "conciergeForm") {
    payload.email = cleanOptional(payload.email);
  }
  return payload;
}

async function supabaseInsert(table, payload) {
  if (!config.supabaseUrl || !config.supabasePublishableKey) throw new Error("backend_not_configured");

  const response = await fetch(`${config.supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.supabasePublishableKey,
      Prefer: "return=minimal"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error(await response.text());
}

function storeDraft(key, payload) {
  try {
    localStorage.setItem(key, JSON.stringify({ ...payload, saved_at: new Date().toISOString() }));
  } catch (_) {}
}

function clearDraft(key) {
  try { localStorage.removeItem(key); } catch (_) {}
}

function bindForm(id, table, draftKey) {
  const form = qs(id);
  if (!form) return;
  const success = form.querySelector(".success");

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const button = form.querySelector('button[type="submit"]');
    const initialLabel = button.textContent;
    const payload = normalizePayload(form, serializeForm(form));

    storeDraft(draftKey, payload);
    button.disabled = true;
    button.textContent = "Envoi…";

    if (success) {
      success.classList.remove("show");
      success.textContent = "";
    }

    try {
      await supabaseInsert(table, payload);
      clearDraft(draftKey);

      if (success) {
        success.textContent = "Merci ! Votre demande a bien été enregistrée. L'équipe DZAIRLY reviendra vers vous rapidement.";
        success.classList.add("show");
      }
      form.reset();
    } catch (error) {
      console.error("DZAIRLY form submission failed", error);
      if (success) {
        success.textContent = "L'envoi n'a pas abouti. Votre saisie est conservée sur cet appareil : réessayez dans quelques instants.";
        success.classList.add("show");
      }
    } finally {
      button.disabled = false;
      button.textContent = initialLabel;
    }
  });
}

bindForm("eventForm", "leads", "dzairly_event_draft");
bindForm("vendorForm", "vendor_applications", "dzairly_vendor_draft");
bindForm("conciergeForm", "concierge_requests", "dzairly_concierge_draft");

function vendorFilterKey(category = "") {
  const normalized = category.toLowerCase();
  if (normalized.includes("salle")) return "salle";
  if (normalized.includes("traiteur")) return "traiteur";
  if (normalized.includes("photo") || normalized.includes("vidéo") || normalized.includes("video")) return "photo";
  if (normalized.includes("décor") || normalized.includes("decor")) return "deco";
  return "other";
}

function makeVendorCard(vendor) {
  const article = document.createElement("article");
  article.className = "vendor-card";
  article.dataset.category = vendorFilterKey(vendor.category);

  const visual = document.createElement("div");
  visual.className = "vendor-visual";

  if (vendor.cover_image_url) {
    visual.style.backgroundImage = `linear-gradient(rgba(0,0,0,.10),rgba(0,0,0,.16)),url("${vendor.cover_image_url.replace(/"/g, "")}")`;
    visual.style.backgroundSize = "cover";
    visual.style.backgroundPosition = "center";
  }

  const body = document.createElement("div");
  body.className = "vendor-body";

  const top = document.createElement("div");
  top.className = "vendor-top";

  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = `${vendor.category} · ${vendor.city}`;
  top.appendChild(tag);

  if (vendor.verified) {
    const verified = document.createElement("span");
    verified.className = "small muted";
    verified.textContent = "✓ Vérifié";
    top.appendChild(verified);
  }

  const title = document.createElement("h3");
  title.textContent = vendor.business_name;

  const meta = document.createElement("div");
  meta.className = "vendor-meta";

  const left = document.createElement("span");
  left.textContent = vendor.capacity_label || "Prestataire DZAIRLY";

  const right = document.createElement("span");
  right.textContent = vendor.price_label || "Devis sur demande";

  meta.append(left, right);
  body.append(top, title, meta);
  article.append(visual, body);

  return article;
}

async function loadPublishedVendors() {
  const grid = document.querySelector(".vendor-grid");
  if (!grid || !config.supabaseUrl || !config.supabasePublishableKey) return;

  try {
    const fields = "business_name,slug,category,city,capacity_label,price_label,cover_image_url,verified,featured";
    const response = await fetch(
      `${config.supabaseUrl}/rest/v1/vendors?select=${encodeURIComponent(fields)}&published=eq.true&order=featured.desc,created_at.desc`,
      { headers: { apikey: config.supabasePublishableKey } }
    );

    if (!response.ok) throw new Error(await response.text());

    const vendors = await response.json();
    if (!Array.isArray(vendors) || vendors.length === 0) return;

    grid.innerHTML = "";
    vendors.forEach(vendor => grid.appendChild(makeVendorCard(vendor)));

    const join = document.createElement("div");
    join.className = "empty";
    join.innerHTML = 'Vous êtes prestataire en Algérie ? <a href="#pro"><b>Rejoignez DZAIRLY →</b></a>';
    grid.appendChild(join);
  } catch (error) {
    console.warn("DZAIRLY vendor loading failed", error);
  }
}

loadPublishedVendors();

const pills = [...document.querySelectorAll("[data-filter]")];
pills.forEach(pill => pill.addEventListener("click", () => {
  pills.forEach(item => item.classList.remove("active"));
  pill.classList.add("active");

  const value = pill.dataset.filter;
  [...document.querySelectorAll(".vendor-card[data-category]")].forEach(card => {
    card.style.display = (value === "all" || card.dataset.category === value) ? "" : "none";
  });
}));
