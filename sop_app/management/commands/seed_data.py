"""
Management command: python manage.py seed_data
Seeds initial reference data and demo SOPs.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from sop_app.models import Refinery, Department, ProcessUnit, SOP, SOPSection, SOPComponent, ApprovalStep, Notification


class Command(BaseCommand):
    help = 'Seed initial reference data and demo SOPs'

    def handle(self, *args, **options):
        self.stdout.write('Seeding reference data...')

        # Refineries
        refineries = [
            ('MUM', 'Mumbai Refinery',          'Maharashtra'),
            ('VIZ', 'Visakhapatnam Refinery',   'Andhra Pradesh'),
            ('RAJ', 'Rajasthan Refinery',        'Rajasthan'),
        ]
        for code, name, state in refineries:
            Refinery.objects.get_or_create(code=code, defaults={'name': name, 'state': state})

        # Departments
        departments = [
            ('OPS', 'Operations'),
            ('MNT', 'Maintenance'),
            ('HSE', 'HSE'),
            ('PRO', 'Process Engineering'),
            ('QC',  'Quality Control'),
            ('UTL', 'Utilities'),
            ('INS', 'Inspection'),
        ]
        for code, name in departments:
            Department.objects.get_or_create(code=code, defaults={'name': name})

        # Process Units
        units = [
            ('NHT', 'NHT',         'Naphtha Hydrotreater',       'Removes sulphur, nitrogen from naphtha feed.'),
            ('CDU', 'CDU',         'Crude Distillation Unit',     'Atmospheric distillation of crude oil.'),
            ('VDU', 'VDU',         'Vacuum Distillation Unit',    'Distillation of atmospheric residue.'),
            ('CCR', 'CCR',         'Catalytic Reformer',          'Converts naphtha into high-octane gasoline.'),
            ('FCC', 'FCC',         'Fluid Catalytic Cracker',     'Cracks heavy gas oil to produce petrol.'),
            ('HCU', 'HCU',         'Hydrocracker',                'High-pressure hydrogenation unit.'),
            ('ARU', 'ARU',         'Amine Recovery Unit',         'Recovers amine solution from acid gas.'),
            ('SRU', 'SRU',         'Sulphur Recovery Unit',       'Converts H2S to elemental sulphur.'),
            ('UTL', 'Utilities',   'Utilities Section',           'Steam, power, cooling water systems.'),
            ('BLR', 'Boiler House','Boiler House',                'Steam generation through fuel-fired boilers.'),
        ]
        for code, name, full, desc in units:
            ProcessUnit.objects.get_or_create(code=code, defaults={
                'name': name, 'full_name': full, 'description': desc
            })

        # Demo users
        demo_users = [
            ('rajesh.kumar',   'Rajesh',   'Kumar',   'r.kumar@hpcl.in'),
            ('priya.sharma',   'Priya',    'Sharma',  'p.sharma@hpcl.in'),
            ('venkat.rao',     'Venkat',   'Rao',     'v.rao@hpcl.in'),
            ('arjun.patel',    'Arjun',    'Patel',   'a.patel@hpcl.in'),
            ('gurpreet.singh', 'Gurpreet', 'Singh',   'g.singh@hpcl.in'),
        ]
        users = {}
        for uname, first, last, email in demo_users:
            u, created = User.objects.get_or_create(username=uname, defaults={
                'first_name': first, 'last_name': last, 'email': email
            })
            if created:
                u.set_password('hpcl@1234')
                u.save()
            users[uname] = u

        # Demo SOPs
        ref_mum  = Refinery.objects.get(code='MUM')
        ref_viz  = Refinery.objects.get(code='VIZ')
        dept_ops = Department.objects.get(code='OPS')
        dept_hse = Department.objects.get(code='HSE')
        unit_nht = ProcessUnit.objects.get(code='NHT')
        unit_cdu = ProcessUnit.objects.get(code='CDU')

        if not SOP.objects.filter(sop_number='SOP-MUM-OPS-NHT-2025-001').exists():
            sop1 = SOP.objects.create(
                sop_number='SOP-MUM-OPS-NHT-2025-001',
                title='Naphtha Hydrotreater Startup Procedure',
                version='1.0',
                status='approved',
                refinery=ref_mum,
                department=dept_ops,
                unit=unit_nht,
                prepared_by=users['rajesh.kumar'],
            )
            sop1.tags = ['startup', 'safety', 'commissioning']
            sop1.save()

            sec1 = SOPSection.objects.create(sop=sop1, name='Introduction', order=0)
            SOPComponent.objects.create(
                section=sec1, type='text', order=0, weight=3,
                content='<p>This SOP covers the complete startup procedure for the Naphtha Hydrotreater unit.</p>'
            )
            tbl_comp = SOPComponent(section=sec1, type='table', order=1, weight=2)
            tbl_comp.table_rows = [
                ['Parameter', 'Value', 'Limit'],
                ['Feed Temperature', '320°C', '280–360°C'],
                ['H2 Partial Pressure', '45 bar', '40–55 bar'],
            ]
            tbl_comp.save()

            sec2 = SOPSection.objects.create(sop=sop1, name='Procedure', order=1)
            SOPComponent.objects.create(
                section=sec2, type='text', order=0, weight=5,
                content='<p>Step 1: Verify all isolation valves are in open position.</p><p>Step 2: Initiate feed flow at minimum rate.</p>'
            )

            # Approval chain (all approved)
            ApprovalStep.objects.create(sop=sop1, step=1, role='Unit Supervisor',
                approver=users['gurpreet.singh'], status='approved', comment='Looks correct.')
            ApprovalStep.objects.create(sop=sop1, step=2, role='Department Head',
                approver=users['priya.sharma'], status='approved')

        if not SOP.objects.filter(sop_number='SOP-MUM-HSE-CDU-2025-002').exists():
            sop2 = SOP.objects.create(
                sop_number='SOP-MUM-HSE-CDU-2025-002',
                title='Crude Distillation Unit Safety Shutdown',
                version='1.0',
                status='review',
                refinery=ref_mum,
                department=dept_hse,
                unit=unit_cdu,
                prepared_by=users['priya.sharma'],
            )
            sop2.tags = ['safety', 'shutdown']
            sop2.save()

            sec = SOPSection.objects.create(sop=sop2, name='Procedure', order=0)
            SOPComponent.objects.create(
                section=sec, type='text', order=0, weight=4,
                content='<p>Emergency shutdown procedure for the CDU unit.</p>'
            )

            ApprovalStep.objects.create(sop=sop2, step=1, role='HSE Officer',
                approver=users['venkat.rao'], status='pending')

            # Notification for the pending approver
            Notification.objects.get_or_create(
                user=users['venkat.rao'],
                title=f'Approval required: {sop2.sop_number}',
                defaults={
                    'type': 'approval_request',
                    'message': f'Priya Sharma submitted "{sop2.title}" for your approval.',
                    'sop': sop2,
                }
            )

        # ── Additional mock SOPs ──────────────────────────────────
        ref_viz  = Refinery.objects.get(code='VIZ')
        ref_raj  = Refinery.objects.get(code='RAJ')
        dept_mnt = Department.objects.get(code='MNT')
        dept_pro = Department.objects.get(code='PRO')
        dept_qc  = Department.objects.get(code='QC')
        unit_fcc = ProcessUnit.objects.get(code='FCC')
        unit_hcu = ProcessUnit.objects.get(code='HCU')
        unit_vdu = ProcessUnit.objects.get(code='VDU')
        unit_ccr = ProcessUnit.objects.get(code='CCR')
        unit_aru = ProcessUnit.objects.get(code='ARU')
        unit_sru = ProcessUnit.objects.get(code='SRU')

        extra_sops = [
            ('SOP-VIZ-OPS-FCC-2025-001', 'FCC Regenerator Temperature Control',
             ref_viz, dept_ops, unit_fcc, users['venkat.rao'], 'draft', ['temperature','control']),
            ('SOP-RAJ-PRO-HCU-2025-001', 'Hydrocracker Feed Rate Optimization',
             ref_raj, dept_pro, unit_hcu, users['arjun.patel'], 'rejected', ['optimization','feed']),
            ('SOP-RAJ-MNT-VDU-2025-001', 'Vacuum Distillation Column Maintenance Protocol',
             ref_raj, dept_mnt, unit_vdu, users['gurpreet.singh'], 'approved', ['maintenance','vdu']),
            ('SOP-MUM-OPS-CCR-2025-001', 'CCR Catalyst Regeneration Procedure',
             ref_mum, dept_ops, unit_ccr, users['priya.sharma'], 'review', ['catalyst','ccr']),
            ('SOP-VIZ-HSE-ARU-2025-002', 'Amine Recovery Unit H2S Monitoring',
             ref_viz, dept_hse, unit_aru, users['venkat.rao'], 'approved', ['h2s','monitoring','aru']),
            ('SOP-RAJ-OPS-SRU-2025-001', 'Sulphur Recovery Unit Startup Checklist',
             ref_raj, dept_ops, unit_sru, users['arjun.patel'], 'draft', ['startup','sulphur']),
            ('SOP-RAJ-QC-NHT-2025-001', 'NHT Feed Quality Specification Verification',
             ref_raj, dept_qc, unit_nht, users['gurpreet.singh'], 'approved', ['quality','nht']),
            ('SOP-MUM-PRO-CDU-2025-003', 'Crude Distillation Throughput Optimization',
             ref_mum, dept_pro, unit_cdu, users['rajesh.kumar'], 'review', ['throughput','cdu']),
        ]

        for sop_num, title, refinery, dept, unit, user, status, tags in extra_sops:
            if not SOP.objects.filter(sop_number=sop_num).exists():
                sop = SOP.objects.create(
                    sop_number=sop_num, title=title, version='1.0',
                    status=status, refinery=refinery, department=dept,
                    unit=unit, prepared_by=user,
                )
                sop.tags = tags
                sop.save()

                sec = SOPSection.objects.create(sop=sop, name='Procedure', order=0)
                SOPComponent.objects.create(
                    section=sec, type='text', order=0, weight=3,
                    content=f'<p>Standard operating procedure for {title}.</p>'
                )

                if status == 'review':
                    ApprovalStep.objects.create(
                        sop=sop, step=1, role='Unit Supervisor',
                        approver=users['gurpreet.singh'], status='pending'
                    )
                elif status == 'approved':
                    ApprovalStep.objects.create(
                        sop=sop, step=1, role='Unit Supervisor',
                        approver=users['gurpreet.singh'], status='approved',
                        comment='Approved.'
                    )

        self.stdout.write(self.style.SUCCESS('✓ Seed data loaded successfully.'))
