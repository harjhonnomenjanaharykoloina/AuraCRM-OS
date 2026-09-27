import { describe, expect, it } from "vitest";
import { CsvField, buildCsvFromRecords, escapeCsv, formatCsvCell, resolveCsvCellValue, sanitizeCsvFormula } from "@/lib/csv";

describe("csv formatting", () => {
    it("neutralizes spreadsheet formula prefixes", () => {
        expect(sanitizeCsvFormula("=1+1")).toBe("'=1+1");
        expect(sanitizeCsvFormula("+SUM(A1:A2)")).toBe("'+SUM(A1:A2)");
        expect(sanitizeCsvFormula("-2+3")).toBe("'-2+3");
        expect(sanitizeCsvFormula("@cmd")).toBe("'@cmd");
        expect(sanitizeCsvFormula("  =A1")).toBe("'  =A1");
    });

    it("does not modify safe values", () => {
        expect(sanitizeCsvFormula("normal text")).toBe("normal text");
        expect(sanitizeCsvFormula("12345")).toBe("12345");
        expect(sanitizeCsvFormula("'=already-safe")).toBe("'=already-safe");
    });

    it("keeps existing csv escaping behavior", () => {
        expect(escapeCsv("hello")).toBe("hello");
        expect(escapeCsv("a,b")).toBe('"a,b"');
        expect(escapeCsv("first\nsecond")).toBe('"first\nsecond"');
        expect(escapeCsv('he said "hi"')).toBe('he said ""hi""');
    });

    it("applies formula neutralization before escaping", () => {
        expect(formatCsvCell("=A1,A2")).toBe("\"'=A1,A2\"");
        expect(formatCsvCell("normal,value")).toBe('"normal,value"');
    });
});

describe("buildCsvFromRecords", () => {
    const picklistField: CsvField = {
        apiName: "status",
        label: "Status",
        type: "Picklist",
        picklistOptions: [{ id: 1, label: "Active" }, { id: 2, label: "Inactive" }],
    };
    const lookupField: CsvField = {
        apiName: "owner",
        label: "Owner",
        type: "Lookup",
    };
    const textField: CsvField = {
        apiName: "name",
        label: "Name",
        type: "Text",
    };

    function makeFields() {
        return [picklistField, lookupField, textField];
    }

    it("uses field labels in header and returns header only when no records", () => {
        const csv = buildCsvFromRecords(makeFields(), []);
        expect(csv).toBe("Status,Owner,Name");
    });

    it("resolves picklist id to option label; unknown id falls back to raw id string", () => {
        expect(resolveCsvCellValue(picklistField, 1)).toBe("Active");
        expect(resolveCsvCellValue(picklistField, 99)).toBe("99");
        expect(resolveCsvCellValue(picklistField, null)).toBe("");

        const fields = makeFields();
        const csv = buildCsvFromRecords(fields, [{ status: 1, owner: 10, name: "Acme" }]);
        expect(csv).toBe("Status,Owner,Name\nActive,10,Acme");
    });

    it("resolves lookup id to name via lookupResolutions; missing resolution falls back to raw id", () => {
        const fields = makeFields();
        const lookupResolutions = {
            owner: { "10": { name: "Jane Doe" } },
        };
        const csv = buildCsvFromRecords(fields, [{ status: 2, owner: 10, name: "Acme" }], lookupResolutions);
        expect(csv.split("\n")[1]).toBe("Inactive,Jane Doe,Acme");

        const csvMissing = buildCsvFromRecords(fields, [{ status: 1, owner: 99, name: "Acme" }], lookupResolutions);
        expect(csvMissing.split("\n")[1]).toBe("Active,99,Acme");
    });

    it("neutralizes formula injection and properly quotes", () => {
        const field: CsvField = { apiName: "name", label: "Name", type: "Text" };
        const csv = buildCsvFromRecords([field], [{ name: "=1+1" }]);
        expect(csv).toBe("Name\n'=1+1");
    });

    it("escapes cells containing comma, newline, and quote", () => {
        const field: CsvField = { apiName: "name", label: "Name", type: "Text" };
        const csv = buildCsvFromRecords([field], [{ name: 'he said "hi", there\nok' }]);
        expect(csv).toBe('Name\n"he said ""hi"", there\nok"');
    });

    it("renders null, undefined, and empty-string as empty cells", () => {
        const fields: CsvField[] = [
            { apiName: "a", label: "A", type: "Text" },
            { apiName: "b", label: "B", type: "Text" },
            { apiName: "c", label: "C", type: "Text" },
        ];
        const csv = buildCsvFromRecords(fields, [{ a: null, b: undefined, c: "" }]);
        expect(csv).toBe("A,B,C\n,,");
    });

    it("serializes multiple rows", () => {
        const fields = makeFields();
        const records = [
            { status: 1, owner: 10, name: "Acme" },
            { status: 2, owner: 11, name: "Globex" },
        ];
        const csv = buildCsvFromRecords(fields, records);
        expect(csv).toBe("Status,Owner,Name\nActive,10,Acme\nInactive,11,Globex");
    });
});
