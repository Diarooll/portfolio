import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// sem "globals" no Vitest, a limpeza do DOM entre testes é manual
afterEach(() => cleanup());
