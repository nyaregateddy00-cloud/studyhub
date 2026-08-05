-- ACADEMIC HIERARCHY -------------------------------------------------------
CREATE TABLE public.universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  short_name text,
  county text,
  is_other boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.universities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.universities TO authenticated;
GRANT ALL ON public.universities TO service_role;
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "universities_public_read" ON public.universities FOR SELECT USING (true);
CREATE POLICY "universities_admin_write" ON public.universities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE TRIGGER universities_updated_at BEFORE UPDATE ON public.universities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.faculties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  name text NOT NULL,
  short_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (university_id, name)
);
GRANT SELECT ON public.faculties TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faculties TO authenticated;
GRANT ALL ON public.faculties TO service_role;
ALTER TABLE public.faculties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faculties_public_read" ON public.faculties FOR SELECT USING (true);
CREATE POLICY "faculties_admin_write" ON public.faculties FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE TRIGGER faculties_updated_at BEFORE UPDATE ON public.faculties
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX faculties_university_idx ON public.faculties(university_id);

CREATE TABLE public.programmes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id uuid NOT NULL REFERENCES public.faculties(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  level text NOT NULL DEFAULT 'bachelors',
  duration_years integer NOT NULL DEFAULT 4,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (faculty_id, name)
);
GRANT SELECT ON public.programmes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programmes TO authenticated;
GRANT ALL ON public.programmes TO service_role;
ALTER TABLE public.programmes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "programmes_public_read" ON public.programmes FOR SELECT USING (true);
CREATE POLICY "programmes_admin_write" ON public.programmes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE TRIGGER programmes_updated_at BEFORE UPDATE ON public.programmes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX programmes_faculty_idx ON public.programmes(faculty_id);

CREATE TABLE public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  year_of_study integer,
  semester integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (programme_id, code)
);
GRANT SELECT ON public.units TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.units TO authenticated;
GRANT ALL ON public.units TO service_role;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "units_public_read" ON public.units FOR SELECT USING (true);
CREATE POLICY "units_admin_write" ON public.units FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE TRIGGER units_updated_at BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX units_programme_idx ON public.units(programme_id);

-- NOTE METADATA -------------------------------------------------------------
ALTER TABLE public.notes
  ADD COLUMN university_id uuid REFERENCES public.universities(id) ON DELETE SET NULL,
  ADD COLUMN faculty_id uuid REFERENCES public.faculties(id) ON DELETE SET NULL,
  ADD COLUMN programme_id uuid REFERENCES public.programmes(id) ON DELETE SET NULL,
  ADD COLUMN unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  ADD COLUMN year_of_study integer,
  ADD COLUMN semester integer,
  ADD COLUMN unit_code text,
  ADD COLUMN lecturer text,
  ADD COLUMN academic_year text,
  ADD COLUMN resource_type text NOT NULL DEFAULT 'lecture_notes';

CREATE INDEX notes_university_idx ON public.notes(university_id);
CREATE INDEX notes_unit_idx ON public.notes(unit_id);
CREATE INDEX notes_resource_type_idx ON public.notes(resource_type);

-- SEED: MAJOR KENYAN UNIVERSITIES -------------------------------------------
INSERT INTO public.universities (name, short_name, county, is_other) VALUES
  ('University of Nairobi','UoN','Nairobi',false),
  ('Kenyatta University','KU','Kiambu',false),
  ('Jomo Kenyatta University of Agriculture and Technology','JKUAT','Kiambu',false),
  ('Moi University','MU','Uasin Gishu',false),
  ('Egerton University','EU','Nakuru',false),
  ('Maseno University','Maseno','Kisumu',false),
  ('Technical University of Kenya','TUK','Nairobi',false),
  ('Strathmore University','SU','Nairobi',false),
  ('United States International University Africa','USIU-A','Nairobi',false),
  ('Dedan Kimathi University of Technology','DeKUT','Nyeri',false),
  ('Masinde Muliro University of Science and Technology','MMUST','Kakamega',false),
  ('Kisii University','KSU','Kisii',false),
  ('Chuka University','CU','Tharaka-Nithi',false),
  ('Multimedia University of Kenya','MMU','Nairobi',false),
  ('Mount Kenya University','MKU','Kiambu',false),
  ('Kabarak University','KABU','Nakuru',false),
  ('Daystar University','DU','Machakos',false),
  ('Pwani University','PU','Kilifi',false),
  ('South Eastern Kenya University','SEKU','Kitui',false),
  ('Other University','Other',NULL,true);

-- SEED: FACULTIES FOR THE FIVE LARGEST --------------------------------------
INSERT INTO public.faculties (university_id, name, short_name)
SELECT u.id, f.name, f.short_name
FROM public.universities u
CROSS JOIN (VALUES
  ('School of Computing and Information Technology','SCIT'),
  ('School of Engineering','SOE'),
  ('School of Business and Economics','SBE'),
  ('School of Education','SOEd'),
  ('School of Health Sciences','SHS'),
  ('School of Law','SOL'),
  ('School of Science','SOS')
) AS f(name, short_name)
WHERE u.short_name IN ('UoN','KU','JKUAT','MU','SU');

-- SEED: PROGRAMMES ----------------------------------------------------------
INSERT INTO public.programmes (faculty_id, name, code, level, duration_years)
SELECT f.id, p.name, p.code, 'bachelors', p.years
FROM public.faculties f
JOIN (VALUES
  ('School of Computing and Information Technology','BSc Computer Science','BSC-CS',4),
  ('School of Computing and Information Technology','BSc Information Technology','BSC-IT',4),
  ('School of Computing and Information Technology','BSc Software Engineering','BSC-SE',4),
  ('School of Engineering','BSc Electrical & Electronic Engineering','BSC-EEE',5),
  ('School of Engineering','BSc Civil Engineering','BSC-CIV',5),
  ('School of Engineering','BSc Mechanical Engineering','BSC-MEC',5),
  ('School of Business and Economics','Bachelor of Commerce','BCOM',4),
  ('School of Business and Economics','BSc Economics','BSC-ECON',4),
  ('School of Education','Bachelor of Education (Arts)','BED-ARTS',4),
  ('School of Education','Bachelor of Education (Science)','BED-SCI',4),
  ('School of Health Sciences','Bachelor of Medicine & Surgery','MBChB',6),
  ('School of Health Sciences','Bachelor of Science in Nursing','BSN',4),
  ('School of Law','Bachelor of Laws','LLB',4),
  ('School of Science','BSc Mathematics','BSC-MATH',4),
  ('School of Science','BSc Biochemistry','BSC-BCH',4)
) AS p(faculty_name, name, code, years) ON p.faculty_name = f.name;

-- SEED: SAMPLE UNITS FOR COMPUTING PROGRAMMES -------------------------------
INSERT INTO public.units (programme_id, code, name, year_of_study, semester)
SELECT pr.id, u.code, u.name, u.yr, u.sem
FROM public.programmes pr
JOIN (VALUES
  ('ICS 2101','Introduction to Programming',1,1),
  ('ICS 2102','Data Structures and Algorithms',1,2),
  ('ICS 2203','Database Systems',2,1),
  ('ICS 2204','Operating Systems',2,2),
  ('ICS 2305','Computer Networks',3,1),
  ('ICS 2306','Software Engineering',3,2),
  ('ICS 2407','Artificial Intelligence',4,1),
  ('ICS 2408','Distributed Systems',4,2)
) AS u(code, name, yr, sem) ON true
WHERE pr.code IN ('BSC-CS','BSC-IT','BSC-SE');