-- schema.sql
-- Database Schema for Pharma Sales Analytics

-- 1. Regions Dimension Table
CREATE TABLE IF NOT EXISTS Regions (
    RegionID INTEGER PRIMARY KEY AUTOINCREMENT,
    City VARCHAR(100),
    Country VARCHAR(100),
    Latitude DECIMAL(10, 6),
    Longitude DECIMAL(10, 6)
);

-- 2. Doctors (Customers) Dimension Table
CREATE TABLE IF NOT EXISTS Doctors (
    DoctorID INTEGER PRIMARY KEY AUTOINCREMENT,
    CustomerName VARCHAR(255),
    Distributor VARCHAR(255),
    Channel VARCHAR(50),
    SubChannel VARCHAR(50)
);

-- 3. Drugs (Products) Dimension Table
CREATE TABLE IF NOT EXISTS Drugs (
    DrugID INTEGER PRIMARY KEY AUTOINCREMENT,
    ProductName VARCHAR(100),
    ProductClass VARCHAR(100)
);

-- 4. Sales Representatives Dimension Table
CREATE TABLE IF NOT EXISTS SalesReps (
    RepID INTEGER PRIMARY KEY AUTOINCREMENT,
    RepName VARCHAR(100),
    Manager VARCHAR(100),
    SalesTeam VARCHAR(50),
    Password TEXT
);

-- 5. Sales Fact Table
CREATE TABLE IF NOT EXISTS Sales (
    SalesID INTEGER PRIMARY KEY AUTOINCREMENT,
    RegionID INTEGER,
    DoctorID INTEGER,
    DrugID INTEGER,
    RepID INTEGER,
    Month VARCHAR(20),
    Year INTEGER,
    Quantity INTEGER,
    Price DECIMAL(10, 2),
    TotalSales DECIMAL(12, 2),
    FOREIGN KEY (RegionID) REFERENCES Regions(RegionID),
    FOREIGN KEY (DoctorID) REFERENCES Doctors(DoctorID),
    FOREIGN KEY (DrugID) REFERENCES Drugs(DrugID),
    FOREIGN KEY (RepID) REFERENCES SalesReps(RepID)
);
