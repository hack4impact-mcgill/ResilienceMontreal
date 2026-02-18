"use client";

import React from "react";
import { useTranslations } from "next-intl";

const HomePage: React.FC = () => {
  const t = useTranslations("HomePage");
  return (
    <div className="p-8">
      <div>
        <h2 className="text-2xl font-bold">{t("heading")}</h2>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
      </div>
    </div>
  );
};

export default HomePage;
