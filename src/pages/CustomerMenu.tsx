import { useEffect, useState } from "react";
import type { Service } from "../types/database";
import { ServiceService } from "../services/serviceService";
import type { Package } from "../services/packageService";
import { PackageService } from "../services/packageService";
import Hero from "../components/menu/Hero";
import CategorySection from "../components/menu/CategorySection";
import BookingModal from "../components/menu/BookingModal";
import Footer from "../components/menu/Footer";
import PackageCard from "../components/menu/PackageCard";
function CustomerMenu() {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedPackage, setSelectedPackage] =
  useState<Package | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  async function loadServices() {
    try {
      const data = await ServiceService.getAll();
      setServices(data);
    } catch (error: any) {
      alert(error.message);
    }
  }
async function loadPackages() {
  try {
    const data = await PackageService.getActive();
    setPackages(data);
  } catch (error: any) {
    alert(error.message);
  }
}
 useEffect(() => {
  loadServices();
  loadPackages();
}, []);

  const categories = Array.from(
    new Set(services.map((service) => service.category))
  );

  return (
    <div style={page}>
      <Hero />

     <section id="menu-content" style={content}>
        {packages.length > 0 && (
  <>
    <h2
      style={{
        marginTop: 40,
        marginBottom: 20,
        fontSize: 30,
      }}
    >
      🎁 热门套餐 / Packages
    </h2>

    <div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill,minmax(360px,1fr))",
    gap: 24,
    marginBottom: 50,
  }}
>
{packages.map((item) => (
  <PackageCard
    key={item.id}
    packageItem={item}
    onBook={() => setSelectedPackage(item)}
  />
))}
</div>
  </>
)}
        <h1>服务菜单 / Service Menu</h1>

        <p style={{ color: "#6b7280" }}>
          扫码查看服务价格与预计施工时间
        </p>

        {categories.map((category) => (
          <CategorySection
            key={category}
            title={category}
            services={services.filter(
              (service) => service.category === category
            )}
            onBook={(service) => setSelectedService(service)}
          />
        ))}

        <Footer />
      </section>

      {selectedService && (
        <BookingModal
          service={selectedService}
          onClose={() => setSelectedService(null)}
        />
      )}
      {selectedPackage && (
  <BookingModal
    packageItem={selectedPackage}
    onClose={() => setSelectedPackage(null)}
  />
)}
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background: "#f3f4f6",
};

const content = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: 24,
};

export default CustomerMenu;