// allFree: true keeps every feature free with no upgrade UI. To sell Pro later, set it to
// false and fill in the Gumroad checkout links (one network-wide Pro pass works on every site).
window.SITE = {
  name: "PriceBoard",
  url: "https://pricelist.roohsites.com",
  allFree: true,
  monthlyUrl: "https://gumroad.com/",
  lifetimeUrl: "https://gumroad.com/",
  monthlyPrice: "",
  lifetimePrice: "",
  proFeatures: [],
};

// Owner opt-out: open any page once with ?notrack=1 to stop counting your own visits in this
// browser (?notrack=0 turns counting back on). Analytics events are dropped before sending.
(function () {
  try {
    var q = new URLSearchParams(location.search).get("notrack");
    if (q === "1") localStorage.setItem("rooh-notrack", "1");
    if (q === "0") localStorage.removeItem("rooh-notrack");
    if (localStorage.getItem("rooh-notrack")) {
      window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
      window.va("beforeSend", function () { return null; });
    }
  } catch (e) {}
})();
