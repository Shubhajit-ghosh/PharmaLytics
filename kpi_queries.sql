-- kpi_queries.sql
-- Advanced Analytics Queries for Pharma Sales Dataset

-- ==========================================
-- 1. Monthly Revenue Growth (Window Functions)
-- ==========================================
WITH MonthlySales AS (
    SELECT 
        Year, 
        Month,
        CASE Month
            WHEN 'January' THEN 1 WHEN 'February' THEN 2 WHEN 'March' THEN 3
            WHEN 'April' THEN 4 WHEN 'May' THEN 5 WHEN 'June' THEN 6
            WHEN 'July' THEN 7 WHEN 'August' THEN 8 WHEN 'September' THEN 9
            WHEN 'October' THEN 10 WHEN 'November' THEN 11 WHEN 'December' THEN 12
        END as MonthNum,
        SUM(TotalSales) as Revenue
    FROM Sales
    GROUP BY Year, Month
),
MonthlyGrowth AS (
    SELECT 
        Year, 
        Month, 
        Revenue,
        LAG(Revenue) OVER (ORDER BY Year, MonthNum) as PrevMonthRevenue,
        (Revenue - LAG(Revenue) OVER (ORDER BY Year, MonthNum)) / LAG(Revenue) OVER (ORDER BY Year, MonthNum) * 100 as GrowthPercentage
    FROM MonthlySales
)
SELECT 
    Year, Month, Revenue, PrevMonthRevenue, ROUND(GrowthPercentage, 2) as GrowthPercentage 
FROM MonthlyGrowth;


-- ==========================================
-- 2. Top 3 Drugs by Region (CTEs & Window Functions)
-- ==========================================
WITH DrugSalesByRegion AS (
    SELECT 
        r.RegionID, 
        r.Country, 
        r.City, 
        d.ProductName, 
        SUM(s.TotalSales) as TotalDrugSales
    FROM Sales s
    JOIN Regions r ON s.RegionID = r.RegionID
    JOIN Drugs d ON s.DrugID = d.DrugID
    GROUP BY r.RegionID, r.Country, r.City, d.ProductName
),
RankedDrugs AS (
    SELECT 
        *,
        RANK() OVER (PARTITION BY RegionID ORDER BY TotalDrugSales DESC) as SalesRank
    FROM DrugSalesByRegion
)
SELECT Country, City, ProductName, TotalDrugSales, SalesRank
FROM RankedDrugs 
WHERE SalesRank <= 3;


-- ==========================================
-- 3. Top Sales Representatives by Revenue (Window Functions)
-- ==========================================
SELECT 
    sr.RepName, 
    sr.Manager, 
    sr.SalesTeam, 
    SUM(s.TotalSales) as TotalRevenue,
    DENSE_RANK() OVER (ORDER BY SUM(s.TotalSales) DESC) as GlobalRank
FROM Sales s
JOIN SalesReps sr ON s.RepID = sr.RepID
GROUP BY sr.RepID, sr.RepName, sr.Manager, sr.SalesTeam
ORDER BY TotalRevenue DESC;


-- ==========================================
-- 4. Doctor-wise Prescription Trends (JOINs & Aggregation)
-- ==========================================
SELECT 
    doc.CustomerName, 
    doc.Channel, 
    doc.SubChannel,
    SUM(s.Quantity) as TotalPrescriptions, 
    SUM(s.TotalSales) as TotalSpend
FROM Sales s
JOIN Doctors doc ON s.DoctorID = doc.DoctorID
GROUP BY doc.DoctorID, doc.CustomerName, doc.Channel, doc.SubChannel
ORDER BY TotalPrescriptions DESC
LIMIT 10;
